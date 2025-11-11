package io.ssafy.p.k13c103.coreapi.domain.room.service;

import io.ssafy.p.k13c103.coreapi.common.error.ApiException;
import io.ssafy.p.k13c103.coreapi.common.error.ErrorCode;
import io.ssafy.p.k13c103.coreapi.domain.catalog.entity.ModelCatalog;
import io.ssafy.p.k13c103.coreapi.domain.catalog.repository.ModelCatalogRepository;
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
    private final ModelCatalogRepository modelCatalogRepository;

    /**
     * 채팅 비동기 처리 (트랜잭션 종료 이후 실행)
     */
    @Async("aiTaskExecutor")
    public void processAsync(Long chatId, RoomCreateRequestDto request, String decryptedKey) {
        try {
            ModelCatalog catalog = modelCatalogRepository.findByCode(request.getModel())
                    .orElseThrow(() -> new ApiException(ErrorCode.MODEL_NOT_FOUND));

            chatService.processChatAsync(
                    chatId,
                    request.getBranchId(),
                    decryptedKey,
                    request.getModel(),
                    catalog.getProvider().getCode(),
                    request.isUseLlm()
            );

            log.info("[ASYNC] 비동기 채팅 처리 시작 → chatId={}, model={}, provider={}",
                    chatId, request.getModel(), catalog.getProvider().getCode());
        } catch (Exception e) {
            log.error("[ASYNC] processAsync 실행 실패: {}", e.getMessage());
        }
    }
}
