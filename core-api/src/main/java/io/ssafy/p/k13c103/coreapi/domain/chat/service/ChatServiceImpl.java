package io.ssafy.p.k13c103.coreapi.domain.chat.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.ssafy.p.k13c103.coreapi.common.error.ApiException;
import io.ssafy.p.k13c103.coreapi.common.error.ErrorCode;
import io.ssafy.p.k13c103.coreapi.common.sse.SseEmitterManager;
import io.ssafy.p.k13c103.coreapi.config.properties.AiProcessingProperties;
import io.ssafy.p.k13c103.coreapi.domain.chat.dto.ChatResponseDto;
import io.ssafy.p.k13c103.coreapi.domain.chat.dto.ChatSseEvent;
import io.ssafy.p.k13c103.coreapi.domain.chat.entity.Chat;
import io.ssafy.p.k13c103.coreapi.domain.chat.enums.ChatSseEventType;
import io.ssafy.p.k13c103.coreapi.domain.chat.repository.ChatRepository;
import io.ssafy.p.k13c103.coreapi.domain.llm.AiAsyncClient;
import io.ssafy.p.k13c103.coreapi.domain.llm.LiteLlmWebClient;
import io.ssafy.p.k13c103.coreapi.domain.llm.LlmStreamParser;
import io.ssafy.p.k13c103.coreapi.domain.member.repository.MemberRepository;
import io.ssafy.p.k13c103.coreapi.domain.room.entity.Room;
import io.ssafy.p.k13c103.coreapi.domain.room.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;

import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {

    private final ChatRepository chatRepository;
    private final RoomRepository roomRepository;
    private final MemberRepository memberRepository;
    private final SseEmitterManager sseEmitterManager;
    private final LiteLlmWebClient liteLlmWebClient;
    private final LlmStreamParser llmStreamParser;
    private final AiAsyncClient aiAsyncClient;
    private final ObjectMapper objectMapper;
    private final Executor aiTaskExecutor;  // 동일 스레드풀 명시적으로 주입
    private final AiProcessingProperties aiProcessingProperties;

    @Override
    @Transactional(readOnly = true)
    public Page<ChatResponseDto.SearchedResultInfo> searchByKeywords(List<String> keywords, Pageable pageable, Long memberUid) {
        if (!memberRepository.existsById(memberUid))
            throw new ApiException(ErrorCode.MEMBER_NOT_FOUND);

        if (keywords == null || keywords.isEmpty())
            throw new ApiException(ErrorCode.EMPTY_SEARCH_KEYWORD);
        else if (keywords.size() > 10)
            throw new ApiException(ErrorCode.TOO_MANY_SEARCH_KEYWORD);

        String[] array = convertToArray(keywords);

        Page<Chat> page = chatRepository.searchByAllKeywords(memberUid, array, pageable);

        return page.map(chat -> new ChatResponseDto.SearchedResultInfo(chat));
    }

    /**
     * 채팅 처리 비동기 실행
     * 1. 답변 생성
     * 2. 짧은 요약 생성
     * 3. 긴 요약 + 키워드 생성
     */
    @Async("aiTaskExecutor")
    @Transactional(propagation = Propagation.REQUIRES_NEW, rollbackFor = Exception.class)
    @Override
    public void processChatAsync(Long chatId, Long branchId, String apiKey, String model, String provider, boolean useLlm) {
        Chat chat = chatRepository.findById(chatId)
                .orElseThrow(() -> new ApiException(ErrorCode.CHAT_NOT_FOUND));
        Room room = chat.getRoom();

        log.info("[ASYNC] Chat {} -> 비동기 AI 처리 시작", chatId);

        // 1. 답변 생성
        // message 구성: LLM API 규격에 맞춰 user 질문으로 변환
        List<Map<String, String>> messages = List.of(
                Map.of("role", "user", "content", chat.getQuestion())
        );
        StringBuilder accumulatedAnswer = new StringBuilder();

        CompletableFuture<String> answerFuture = CompletableFuture.supplyAsync(() -> {
            log.info("[STEP 1] Chat {} → 답변 생성 시작", chat.getChatUid());

            try {
                // 스트림 활성화 여부 설정값 반영
                if (!aiProcessingProperties.isStreamEnabled()) {
                    log.warn("[STEP 1] Stream 비활성화됨 → 동기 모드로 처리 예정");
                }

                // Flux<String> 스트림 수신
                Flux<String> stream = liteLlmWebClient.createChatStream(apiKey, model, provider, messages, useLlm);

                // 스트림 구독: 청크 단위로 처리
                stream
                        .doOnNext(chunk -> {
                            String delta = llmStreamParser.extractDeltaContent(chunk);
                            if (delta != null && !delta.isBlank()) {
                                accumulatedAnswer.append(delta);

                                Map<String, Object> payload = new LinkedHashMap<>();
                                payload.put("chat_id", chat.getChatUid());
                                payload.put("delta", delta);

                                sseEmitterManager.sendEvent(
                                        room.getRoomUid(),
                                        new ChatSseEvent<>(ChatSseEventType.CHAT_STREAM, payload)
                                );
                            }

                            // [DONE] 감지 시 DB 업데이트 + SSE 완료 이벤트 전송
                            if (llmStreamParser.isDoneChunk(chunk)) {
                                chat.updateAnswer(accumulatedAnswer.toString());
                                chatRepository.save(chat);

                                Map<String, Object> payload = new LinkedHashMap<>();
                                payload.put("chat_id", chat.getChatUid());
                                payload.put("answer", accumulatedAnswer.toString());
                                payload.put("answered_at", chat.getAnsweredAt());

                                sseEmitterManager.sendEvent(
                                        room.getRoomUid(),
                                        new ChatSseEvent<>(ChatSseEventType.CHAT_DONE, payload)
                                );

                                log.info("[STREAM] Chat {} 스트리밍 종료", chat.getChatUid());
                            }
                        })
                        .doOnError(error -> {
                            log.error("[STREAM] Chat {} 오류 발생: {}", chat.getChatUid(), error.getMessage());

                            Map<String, Object> payload = new LinkedHashMap<>();
                            payload.put("chat_id", chat.getChatUid());
                            payload.put("error", error.getMessage());

                            sseEmitterManager.sendEvent(
                                    room.getRoomUid(),
                                    new ChatSseEvent<>(ChatSseEventType.CHAT_ERROR, payload)
                            );
                        })
                        .doOnComplete(() ->
                                log.info("[STREAM] Chat {} 모든 청크 처리 완료", chat.getChatUid())
                        )
                        .blockLast();

                // 최종 답변 반환
                return accumulatedAnswer.toString();
            } catch (Exception e) {
                log.error("[STEP 1] LLM 스트리밍 실패: {}", e.getMessage());

                Map<String, Object> payload = new LinkedHashMap<>();
                payload.put("chat_id", chat.getChatUid());
                payload.put("error", e.getMessage());

                sseEmitterManager.sendEvent(
                        room.getRoomUid(),
                        new ChatSseEvent<>(ChatSseEventType.CHAT_ERROR, payload)
                );

                throw new ApiException(ErrorCode.LLM_PROCESS_ERROR, e.getMessage());
            }
        }, aiTaskExecutor);

        // 2. 짧은 요약
        CompletableFuture<Void> shortSummaryFuture = answerFuture.thenComposeAsync(aiAnswer ->
                        aiAsyncClient.shortSummaryAsync(aiAnswer)
                                .thenAccept(result -> {
                                    try {
                                        log.info("[STEP 2] 짧은 요약 생성 완료: {}", result.getTitle());

                                        // 방 이름 업데이트
                                        Room freshRoom = roomRepository.findById(room.getRoomUid())
                                                .orElseThrow(() -> new ApiException(ErrorCode.ROOM_NOT_FOUND));
                                        freshRoom.updateName(result.getTitle());
                                        roomRepository.saveAndFlush(freshRoom);

                                        Map<String, Object> payload = new LinkedHashMap<>();
                                        payload.put("room_id", room.getRoomUid());
                                        payload.put("branch_id", branchId);
                                        payload.put("updated_at", room.getUpdatedAt());
                                        payload.put("short_summary", result.getTitle());

                                        sseEmitterManager.sendEvent(
                                                room.getRoomUid(),
                                                new ChatSseEvent<>(ChatSseEventType.ROOM_SHORT_SUMMARY, payload)
                                        );
                                    } catch (Exception e) {
                                        log.error("[STEP 2] 짧은 요약 처리 실패: {}", e.getMessage());
                                    }
                                })
                                .exceptionally(e -> {
                                    log.error("[STEP 2] FastAPI 짧은 요약 호출 실패: {}", e.getMessage());
                                    return null;
                                })
                , aiTaskExecutor);

        // 3. 긴 요약 + 키워드
        CompletableFuture<Void> longSummaryFuture = answerFuture.thenComposeAsync(aiAnswer ->
                        aiAsyncClient.summarizeAsync(aiAnswer)
                                .thenAccept(aiResult -> {
                                    try {
                                        log.info("[STEP 3] 긴 요약 + 키워드 처리 시작");
                                        chat.updateSummaryAndKeywords(aiResult.getSummary(), convertToJson(aiResult.getKeywords()));
                                        chatRepository.save(chat);

                                        Map<String, Object> payload = new LinkedHashMap<>();
                                        payload.put("room_id", room.getRoomUid());
                                        payload.put("branch_id", branchId);
                                        payload.put("updated_at", chat.getUpdatedAt());
                                        payload.put("chat_id", chat.getChatUid());
                                        payload.put("summary", aiResult.getSummary());
                                        payload.put("keywords", aiResult.getKeywords());

                                        sseEmitterManager.sendEvent(
                                                room.getRoomUid(),
                                                new ChatSseEvent<>(ChatSseEventType.CHAT_SUMMARY_KEYWORDS, payload)
                                        );

                                        log.info("[STEP 3] 긴 요약 + 키워드 처리 완료");
                                    } catch (Exception e) {
                                        log.error("[STEP 3] 긴 요약 처리 실패: {}", e.getMessage());
                                    }
                                })
                                .exceptionally(e -> {
                                    log.error("[STEP 3] FastAPI 호출 중 오류: {}", e.getMessage());
                                    return null;
                                })
                , aiTaskExecutor);

        // 4. 2, 3번 작업이 모두 끝나면 완료 로그
        CompletableFuture.allOf(shortSummaryFuture, longSummaryFuture)
                .thenRun(() -> log.info("[ASYNC] Chat {} 전체 처리 완료", chatId))
                .exceptionally(e -> {
                    log.error("[ASYNC] Chat {} 처리 중 오류: {}", chatId, e.getMessage());
                    return null;
                });
    }

    /**
     * SSE: 짧은 요약
     */
    private void sendRoomShortSummaryEvent(Room room, Long branchId, String shortSummary) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("room_id", room.getRoomUid());
        payload.put("branch_id", branchId);
        payload.put("updated_at", room.getUpdatedAt());
        payload.put("short_summary", shortSummary);

        sseEmitterManager.sendEvent(
                room.getRoomUid(),
                new ChatSseEvent<>(ChatSseEventType.ROOM_SHORT_SUMMARY, payload)
        );

        log.info("[SSE] ROOM_SHORT_SUMMARY 전송 완료 → roomId={}", room.getRoomUid());
    }

    /**
     * SSE: 요약 + 키워드
     */
    private void sendChatSummaryKeywordsEvent(Room room, Chat chat, Long branchId, String summary, List<String> keywords) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("room_id", room.getRoomUid());
        payload.put("branch_id", branchId);
        payload.put("updated_at", chat.getUpdatedAt());
        payload.put("chat_id", chat.getChatUid());
        payload.put("summary", summary);
        payload.put("keywords", keywords);

        sseEmitterManager.sendEvent(
                room.getRoomUid(),
                new ChatSseEvent<>(ChatSseEventType.CHAT_SUMMARY_KEYWORDS, payload)
        );

        log.info("[SSE] CHAT_SUMMARY_KEYWORDS 전송 완료 → roomId={}, chatId={}", room.getRoomUid(), chat.getChatUid());
    }

    /**
     * 키워드 직렬화
     */
    private String convertToJson(List<String> keywords) {
        try {
            return objectMapper.writeValueAsString(keywords);
        } catch (JsonProcessingException e) {
            log.warn("[ChatService] 키워드 직렬화 실패: {}", e.getMessage());
            return "[]";
        }
    }

    private String[] convertToArray(List<String> keywords) {
        if (keywords == null) return new String[0];

        Set<String> set = new LinkedHashSet<>();
        for (String k : keywords) {
            if (k == null) continue;
            k = k.trim();
            if (k.isEmpty()) continue;
            k=k.toLowerCase(Locale.ROOT); // 소문자 통일
            set.add(k);
        }

        String arr[] = new String[set.size()];
        int idx = 0;
        for (String s : set)
            arr[idx++] = s;
        return arr;
    }
}
