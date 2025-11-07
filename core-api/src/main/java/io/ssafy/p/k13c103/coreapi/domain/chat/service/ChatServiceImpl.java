package io.ssafy.p.k13c103.coreapi.domain.chat.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.ssafy.p.k13c103.coreapi.common.error.ApiException;
import io.ssafy.p.k13c103.coreapi.common.error.ErrorCode;
import io.ssafy.p.k13c103.coreapi.common.sse.SseEmitterManager;
import io.ssafy.p.k13c103.coreapi.domain.chat.dto.ChatSseEvent;
import io.ssafy.p.k13c103.coreapi.domain.chat.entity.Chat;
import io.ssafy.p.k13c103.coreapi.domain.chat.enums.ChatSseEventType;
import io.ssafy.p.k13c103.coreapi.domain.chat.repository.ChatRepository;
import io.ssafy.p.k13c103.coreapi.domain.room.entity.Room;
import io.ssafy.p.k13c103.coreapi.domain.room.repository.RoomRepository;
import io.ssafy.p.k13c103.coreapi.infrastructure.ai.AiAsyncClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {

    private final ChatRepository chatRepository;
    private final RoomRepository roomRepository;
    private final SseEmitterManager sseEmitterManager;
    private final AiAsyncClient aiAsyncClient;
    private final ObjectMapper objectMapper;
    private final Executor aiTaskExecutor;  // 동일 스레드풀 명시적으로 주입

    /**
     * 채팅 처리 비동기 실행
     * 1. 답변 생성
     * 2. 짧은 요약 생성
     * 3. 긴 요약 + 키워드 생성
     */
    @Async("aiTaskExecutor")
    @Override
    public void processChatAsync(Long chatId, Long branchId) {
        Chat chat = chatRepository.findById(chatId)
                .orElseThrow(() -> new ApiException(ErrorCode.CHAT_NOT_FOUND));
        Room room = chat.getRoom();

        log.info("[ASYNC] Chat {} -> 비동기 AI 처리 시작", chatId);

        // 1. 답변 생성
        CompletableFuture<String> answerFuture = CompletableFuture.supplyAsync(() -> {
            log.info("[STEP 1] Chat {} → 답변 생성 시작", chat.getChatUid());
            try {
                // TODO: LiteLLM API 호출
                String aiAnswer = "AI 호출 결과 (LiteLLM 응답)";

                chat.updateAnswer(aiAnswer);
                chatRepository.save(chat);

                sendChatAnsweredEvent(room, chat, branchId, aiAnswer);
                log.info("[STEP 1] Chat {} → 답변 생성 완료", chat.getChatUid());
                return aiAnswer;
            } catch (Exception e) {
                log.error("[STEP 1] 답변 생성 실패: {}", e.getMessage());
                return "AI 응답 생성 실패";
            }
        }, aiTaskExecutor);

        // 2. 짧은 요약
        CompletableFuture<Void> shortSummaryFuture = answerFuture.thenComposeAsync(aiAnswer ->
                        aiAsyncClient.shortSummaryAsync(aiAnswer)
                                .thenAccept(res -> {
                                    try {
                                        log.info("[STEP 2] 짧은 요약 생성 완료: {}", res.getTitle());

                                        // 방 이름 업데이트
                                        room.updateName(res.getTitle());
                                        roomRepository.save(room);

                                        sendRoomShortSummaryEvent(room, branchId, res.getTitle());
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

                                        sendChatSummaryKeywordsEvent(room, chat, branchId, aiResult.getSummary(), aiResult.getKeywords());
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
     * SSE: 답변
     */
    private void sendChatAnsweredEvent(Room room, Chat chat, Long branchId, String answer) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("room_id", room.getRoomUid());
        payload.put("branch_id", branchId);
        payload.put("updated_at", room.getUpdatedAt());
        payload.put("chat_id", chat.getChatUid());
        payload.put("answer", answer);
        payload.put("answered_at", chat.getAnsweredAt());

        sseEmitterManager.sendEvent(
                room.getRoomUid(),
                new ChatSseEvent<>(ChatSseEventType.CHAT_ANSWERED, payload)
        );

        log.info("[SSE] CHAT_ANSWERED 전송 완료 → roomId={}, chatId={}", room.getRoomUid(), chat.getChatUid());
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
}
