package io.ssafy.p.k13c103.coreapi.domain.chat.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.ssafy.p.k13c103.coreapi.common.error.ApiException;
import io.ssafy.p.k13c103.coreapi.common.error.ErrorCode;
import io.ssafy.p.k13c103.coreapi.common.sse.SseEmitterManager;
import io.ssafy.p.k13c103.coreapi.config.properties.AiProcessingProperties;
import io.ssafy.p.k13c103.coreapi.domain.catalog.entity.ProviderCatalog;
import io.ssafy.p.k13c103.coreapi.domain.catalog.repository.ProviderCatalogRepository;
import io.ssafy.p.k13c103.coreapi.domain.chat.dto.CachedPageDto;
import io.ssafy.p.k13c103.coreapi.domain.chat.dto.ChatRequestDto;
import io.ssafy.p.k13c103.coreapi.domain.chat.dto.ChatResponseDto;
import io.ssafy.p.k13c103.coreapi.domain.chat.dto.ChatSseEvent;
import io.ssafy.p.k13c103.coreapi.domain.chat.entity.Chat;
import io.ssafy.p.k13c103.coreapi.domain.chat.enums.ChatSseEventType;
import io.ssafy.p.k13c103.coreapi.domain.chat.repository.ChatRepository;
import io.ssafy.p.k13c103.coreapi.domain.key.entity.Key;
import io.ssafy.p.k13c103.coreapi.domain.key.repository.KeyRepository;
import io.ssafy.p.k13c103.coreapi.domain.llm.AiAsyncClient;
import io.ssafy.p.k13c103.coreapi.domain.llm.LiteLlmWebClient;
import io.ssafy.p.k13c103.coreapi.domain.llm.LlmStreamParser;
import io.ssafy.p.k13c103.coreapi.domain.member.repository.MemberRepository;
import io.ssafy.p.k13c103.coreapi.domain.room.entity.Room;
import io.ssafy.p.k13c103.coreapi.domain.room.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.core.parameters.P;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;

import java.time.Duration;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.concurrent.atomic.AtomicReference;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {

    private final ChatRepository chatRepository;
    private final RoomRepository roomRepository;
    private final MemberRepository memberRepository;
    private final KeyRepository keyRepository;
    private final ProviderCatalogRepository providerCatalogRepository;
    private final SseEmitterManager sseEmitterManager;
    private final LiteLlmWebClient liteLlmWebClient;
    private final LlmStreamParser llmStreamParser;
    private final AiAsyncClient aiAsyncClient;
    private final ObjectMapper objectMapper;
    private final Executor aiTaskExecutor;  // 동일 스레드풀 명시적으로 주입
    private final AiProcessingProperties aiProcessingProperties;
    private final RedisTemplate<String, String> redisTemplate;

    @Override
    @Transactional(readOnly = true)
    public Page<ChatResponseDto.SearchedResultInfo> searchByKeywords(List<String> keywords, Pageable pageable, Long memberUid) {
        if (!memberRepository.existsById(memberUid))
            throw new ApiException(ErrorCode.MEMBER_NOT_FOUND);

        // 키워드가 없는 경우 전체 조회, 5개 초과인 경우 error
        if (keywords == null || keywords.isEmpty()) {
            Page<Chat> page = chatRepository.findAllChats(memberUid, pageable);
            return page.map(chat -> new ChatResponseDto.SearchedResultInfo(chat));
        } else if (keywords.size() > 5)
            throw new ApiException(ErrorCode.TOO_MANY_SEARCH_KEYWORD);

        // 캐시 조회 후 hit이면 읽어오기
        String key = chatKey(memberUid, keywords);
        String cached = redisTemplate.opsForValue().get(key);
        if (cached != null) {
            try {
                CachedPageDto cachedPage = objectMapper.readValue(cached, CachedPageDto.class);
                List<ChatResponseDto.SearchedResultInfo> content = cachedPage.getContent();
                return new PageImpl<>(content, pageable, cachedPage.getTotal());
            } catch (Exception e) { // ignored
            }
        }

        // DB에서 조회
        String[] array = convertToArray(keywords);
        Page<Chat> page = chatRepository.searchByAllKeywords(memberUid, array, pageable);
        Page<ChatResponseDto.SearchedResultInfo> result = page.map(ChatResponseDto.SearchedResultInfo::new);

        // 캐시에 저장
        try {
            CachedPageDto cacheObj = new CachedPageDto(result.getContent(), result.getTotalElements());
            String json = objectMapper.writeValueAsString(cacheObj);
            redisTemplate.opsForValue().set(key, json, Duration.ofSeconds(30));
        } catch (Exception e) { // ignored
        }

        return result;
    }

    @Override
    @Transactional
    public ChatResponseDto.CopiedChatInfo copyChat(ChatRequestDto.CopyChat request, Long memberUid) {
        if (!memberRepository.existsById(memberUid))
            throw new ApiException(ErrorCode.MEMBER_NOT_FOUND);

        Room room = roomRepository.findByRoomUidAndOwner_MemberUid(request.roomUid(), memberUid)
                .orElseThrow(() -> new ApiException(ErrorCode.ROOM_NOT_FOUND));

        Chat origin = chatRepository.findById(request.originUid())
                .orElseThrow(() -> new ApiException(ErrorCode.CHAT_NOT_FOUND));

        Chat newChat = Chat.cloneFrom(origin, room);
        chatRepository.save(newChat);

        return ChatResponseDto.CopiedChatInfo.builder()
                .copyId(newChat.getChatUid())
                .roomUid(room.getRoomUid())
                .build();
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
    public void processChatAsync(Long chatId, Long branchId, String apiKey, String model, String provider, boolean useLlm, String contextPrompt) {
        Chat chat = chatRepository.findById(chatId)
                .orElseThrow(() -> new ApiException(ErrorCode.CHAT_NOT_FOUND));
        Long roomId = chat.getRoom().getRoomUid();
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ApiException(ErrorCode.ROOM_NOT_FOUND));

        String safeContext = contextPrompt;
        if (safeContext != null && safeContext.length() > 2000) {
            safeContext = safeContext.substring(safeContext.length() - 2000);
            log.debug("[ASYNC] contextPrompt 길이 초과 → 뒤에서 2000자만 사용");
        }

        log.info("[ASYNC] Chat {} -> 비동기 AI 처리 시작 (model={}, provider={}, useLlm={}, ctxLen={})",
                chatId, model, provider, useLlm, safeContext == null ? 0 : safeContext.length());

        // 1. 답변 생성
        // message 구성: LLM API 규격에 맞춰 user 질문으로 변환
        List<Map<String, String>> messages = new ArrayList<>();
        if (safeContext != null && !safeContext.isBlank()) {
            messages.add(Map.of(
                    "role", "system",
                    "content",
                    """
                            당신은 사용자의 대화 히스토리를 이해하고 일관성 있는 응답을 생성하는 AI 어시스턴트입니다.
                            아래의 대화 내용을 참고해 맥락을 유지한 자연스러운 답변을 생성하세요.
                            
                            [이전 대화 요약 또는 내용]
                            """ + safeContext
            ));
        }
        messages.add(Map.of("role", "user", "content", chat.getQuestion()));

        StringBuilder accumulatedAnswer = new StringBuilder();

        CompletableFuture<String> answerFuture = CompletableFuture.supplyAsync(() -> {
            log.info("[STEP 1] Chat {} → 답변 생성 시작", chat.getChatUid());

            try {
                // 스트림 활성화 여부 설정값 반영
                if (!aiProcessingProperties.isStreamEnabled()) {
                    log.warn("[STEP 1] Stream 비활성화됨 → 동기 모드로 처리 예정");
                }

                AtomicReference<JsonNode> usageRef = new AtomicReference<>();
                final boolean[] doneEmitted = {false};

                // Flux<String> 스트림 수신
                Flux<String> stream = liteLlmWebClient.createChatStream(apiKey, model, provider, messages, useLlm);

                // 스트림 구독: 청크 단위로 처리
                stream
                        .doOnNext(chunk -> {
                            try {
                                JsonNode usageNode = llmStreamParser.extractUsage(provider, chunk);
                                if (usageNode != null) {
                                    usageRef.set(usageNode);
                                }

                                String delta = llmStreamParser.extractDeltaContent(provider, chunk);
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
                                if (!doneEmitted[0] && llmStreamParser.isDoneChunk(provider, chunk)) {
                                    doneEmitted[0] = true;

                                    chat.updateAnswer(accumulatedAnswer.toString());

                                    applyTokenUsageIfPresent(room, provider, usageRef.get());

                                    chatRepository.save(chat);

                                    Map<String, Object> payload = new LinkedHashMap<>();
                                    payload.put("chat_id", chat.getChatUid());
                                    payload.put("answer", accumulatedAnswer.toString());
                                    payload.put("answered_at", chat.getAnsweredAt());

                                    sseEmitterManager.sendEvent(
                                            room.getRoomUid(),
                                            new ChatSseEvent<>(ChatSseEventType.CHAT_DONE, payload)
                                    );

                                    log.info("[STREAM] Chat {} 스트리밍 종료 (provider={}, model={})",
                                            chat.getChatUid(), provider, model);
                                }
                            } catch (Exception e) {
                                log.error("[STREAM] 청크 파싱 에러: {}", e.getMessage());
                            }
                        })
                        .doOnError(error -> {
                            log.error("[STREAM] Chat {} 오류 발생: {}", chat.getChatUid(), error.getMessage());

                            try {
                                applyTokenUsageIfPresent(room, provider, usageRef.get());
                            } catch (Exception ex) {
                                log.warn("[STREAM] 오류 중 tokenUsage 반영 실패: {}", ex.getMessage());
                            }

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
                                        if (result == null) {
                                            log.warn("[STEP 2] 짧은 요약 결과가 null 입니다. roomId={}, chatId={}",
                                                    roomId, chat.getChatUid());
                                            return;
                                        }

                                        log.info("[STEP 2] 짧은 요약 생성 완료: {}", result.getTitle());

                                        // 방 이름 업데이트
                                        Room freshRoom = roomRepository.findById(roomId)
                                                .orElseThrow(() -> new ApiException(ErrorCode.ROOM_NOT_FOUND));
                                        freshRoom.updateName(result.getTitle());
                                        roomRepository.saveAndFlush(freshRoom);

                                        Map<String, Object> payload = new LinkedHashMap<>();
                                        payload.put("room_id", roomId);
                                        payload.put("branch_id", branchId);
                                        payload.put("updated_at", freshRoom.getUpdatedAt());
                                        payload.put("short_summary", result.getTitle());

                                        sseEmitterManager.sendEvent(
                                                roomId,
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
                                        if (aiResult == null) {
                                            log.warn("[STEP 3] 긴 요약 결과가 null 입니다. roomId={}, chatId={}",
                                                    roomId, chat.getChatUid());
                                            return;
                                        }

                                        log.info("[STEP 3] 긴 요약 + 키워드 처리 시작");
                                        String summary = aiResult.getSummary();
                                        List<String> keywords = aiResult.getKeywords();

                                        if (summary == null || summary.isBlank()) {
                                            summary = buildFallbackSummary(keywords, aiAnswer);
                                        }

                                        chat.updateSummaryAndKeywords(aiResult.getSummary(), convertToJson(aiResult.getKeywords()));
                                        chatRepository.save(chat);

                                        Map<String, Object> payload = new LinkedHashMap<>();
                                        payload.put("room_id", roomId);
                                        payload.put("branch_id", branchId);
                                        payload.put("updated_at", chat.getUpdatedAt());
                                        payload.put("chat_id", chat.getChatUid());
                                        payload.put("summary", summary);
                                        payload.put("keywords", keywords);

                                        sseEmitterManager.sendEvent(
                                                roomId,
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
            k = k.toLowerCase(Locale.ROOT); // 소문자 통일
            set.add(k);
        }

        String arr[] = new String[set.size()];
        int idx = 0;
        for (String s : set)
            arr[idx++] = s;
        return arr;
    }

    private void applyTokenUsageIfPresent(Room room, String provider, JsonNode usageNode) {
        if (usageNode == null) return;

        // OpenAI / LiteLLM 스타일 (usage.prompt_tokens / completion_tokens)
        int prompt = 0;
        int completion = 0;
        int total = 0;

        // OpenAI 스타일
        if (usageNode.has("prompt_tokens") || usageNode.has("completion_tokens")) {
            prompt = usageNode.path("prompt_tokens").asInt(0);
            completion = usageNode.path("completion_tokens").asInt(0);
            total = prompt + completion;
        }

        // Gemini 스타일 (usageMetadata.*TokenCount)
        if (usageNode.has("promptTokenCount") || usageNode.has("candidatesTokenCount")) {
            int gPrompt = usageNode.path("promptTokenCount").asInt(0);
            int gCompletion = usageNode.path("candidatesTokenCount").asInt(0);
            int gTotal = usageNode.path("totalTokenCount").asInt(gPrompt + gCompletion);

            // 둘 중 더 신뢰 가는 값으로 덮어쓰기 (OpenAI가 아닌 경우 대부분 여기로 들어옴)
            if (gTotal > 0) {
                prompt = gPrompt;
                completion = gCompletion;
                total = gTotal;
            }
        }

        if (total <= 0) {
            log.debug("[USAGE] provider={}, totalTokens=0 → 누적 건너뜀", provider);
            return;
        }

        ProviderCatalog providerCatalog = providerCatalogRepository
                .findByCode(provider)
                .orElseThrow(() -> new ApiException(ErrorCode.PROVIDER_NOT_FOUND));

        Key key = keyRepository.findByMemberAndProvider(room.getOwner(), providerCatalog)
                .orElseThrow(() -> new ApiException(ErrorCode.KEY_NOT_FOUND));

        key.updateTokenUsage(total);
        keyRepository.save(key);

        log.info("[USAGE] member={}, provider={}, +{} tokens (prompt={}, completion={})",
                room.getOwner().getMemberUid(), provider, total, prompt, completion);
    }

    String chatKey(Long memberUid, List<String> keywords) {
        keywords.sort(String.CASE_INSENSITIVE_ORDER);
        String joined = String.join("|", keywords);
        int hash = joined.hashCode();
        return "chat-search:" + memberUid + ":" + hash;
    }

    private String buildFallbackSummary(List<String> keywords, String originalText) {
        if (keywords != null && !keywords.isEmpty()) {
            List<String> top = keywords.stream()
                    .filter(k -> k != null && !k.isBlank())
                    .limit(3)
                    .toList();

            if (!top.isEmpty()) {
                return String.join(", ", top) + " 관련 내용입니다.";
            }
        }

        if (originalText != null && originalText.length() > 120) {
            return originalText.substring(0, 120) + "...";
        }

        return originalText != null ? originalText : "요약 생성이 어려운 내용입니다.";
    }
}
