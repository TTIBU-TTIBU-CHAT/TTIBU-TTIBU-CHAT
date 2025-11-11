package io.ssafy.p.k13c103.coreapi.domain.room.service;

import io.ssafy.p.k13c103.coreapi.domain.chat.service.ChatService;
import io.ssafy.p.k13c103.coreapi.domain.room.dto.RoomCreateRequestDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class AsyncChatProcessor {

    private final ChatService chatService;

    /**
     * 채팅 비동기 처리 (트랜잭션 종료 이후 실행)
     */
    @Async("aiTaskExecutor")
    public void processAsync(Long chatId, RoomCreateRequestDto request, String decryptedKey, String providerCode) {
        try {
            chatService.processChatAsync(
                    chatId,
                    request.getBranchId(),
                    decryptedKey,
                    request.getModel(),
                    providerCode,
                    request.isUseLlm()
            );

            log.info("[ASYNC] 비동기 채팅 처리 시작 → chatId={}, model={}, provider={}",
                    chatId, request.getModel(), providerCode);
        } catch (Exception e) {
            log.error("[ASYNC] processAsync 실행 실패: {}", e.getMessage());
        }
    }
}
