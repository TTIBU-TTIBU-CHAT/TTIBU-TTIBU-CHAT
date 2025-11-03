package io.ssafy.p.k13c103.coreapi.domain.chat.controller;

import io.ssafy.p.k13c103.coreapi.common.error.ApiException;
import io.ssafy.p.k13c103.coreapi.common.error.ErrorCode;
import io.ssafy.p.k13c103.coreapi.common.sse.SseEmitterManager;
import io.ssafy.p.k13c103.coreapi.config.security.CustomMemberDetails;
import io.ssafy.p.k13c103.coreapi.domain.room.service.RoomService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/chats/stream")
public class ChatSseController {

    private final SseEmitterManager sseEmitterManager;
    private final RoomService roomService;

    /* 특정 roomId에 대한 SSE 연결 생성 */
    @GetMapping(value = "/{roomId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter connect(@PathVariable Long roomId,
                              @AuthenticationPrincipal CustomMemberDetails member) {
        if (member == null) {
            log.warn("[SSE] Unauthorized connection attempt to room {}", roomId);
            throw new ApiException(ErrorCode.SSE_UNAUTHORIZED);
        }

        // 해당 채팅방의 소유자인지 검증
        roomService.isOwner(member.getMemberUid(), roomId);

        log.info("[SSE] Member {} connected to room {}", member.getUsername(), roomId);

        SseEmitter emitter = sseEmitterManager.createEmitter(roomId);

        try {
            // 연결 직후 FE가 정상적으로 구독되었음을 알리기 위한 초기 메시지
            emitter.send(SseEmitter.event()
                    .name("INIT")
                    .data("Connected to room " + roomId)
            );
        } catch (Exception e) {
            log.warn("[SSE] Failed to send INIT event for room {}: {}", roomId, e.getMessage());
        }

        return emitter;
    }

    /* 연결 강제 종료 */
    @DeleteMapping("/{roomId}")
    public void disconnect(@PathVariable Long roomId,
                           @AuthenticationPrincipal CustomMemberDetails member) {
        if (member == null) {
            throw new ApiException(ErrorCode.SSE_UNAUTHORIZED);
        }

        // 해당 채팅방의 소유자인지 검증
        roomService.isOwner(member.getMemberUid(), roomId);

        sseEmitterManager.removeEmitter(roomId);
        log.info("[SSE] Member {} disconnected from room {}", member.getUsername(), roomId);
    }
}
