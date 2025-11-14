package io.ssafy.p.k13c103.coreapi.domain.chat.controller;

import io.ssafy.p.k13c103.coreapi.common.error.ApiException;
import io.ssafy.p.k13c103.coreapi.common.error.ErrorCode;
import io.ssafy.p.k13c103.coreapi.common.sse.SseEmitterManager;
import io.ssafy.p.k13c103.coreapi.config.security.CustomMemberDetails;
import io.ssafy.p.k13c103.coreapi.domain.room.service.RoomService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;

@Tag(name = "Chat SSE API", description = "채팅방별 실시간 이벤트 스트림 연결 API")
@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/chats/stream")
public class ChatSseController {

    private final SseEmitterManager sseEmitterManager;
    private final RoomService roomService;

    @Operation(
            summary = "SSE 스트림 연결 (Room 구독)",
            description = """
                    지정한 `roomId`의 실시간 이벤트 스트림(SSE)에 연결합니다.  
                    이 엔드포인트는 브라우저나 프론트엔드의 EventSource 객체로 구독해야 합니다.
                    """,
            responses = {
                    @ApiResponse(responseCode = "200", description = "SSE 연결 성공",
                            content = @Content(mediaType = MediaType.TEXT_EVENT_STREAM_VALUE,
                                    examples = @ExampleObject(value = """
                                            event: INIT
                                            data: Connected to room 3
                                            
                                            event: CHAT_CREATED
                                            data: { "chatUid": 12, "question": "AI 답변 속도는?" }
                                            
                                            event: CHAT_ANSWERED
                                            data: { "answer": "답변이 완료되었습니다." }
                                            
                                            event: CHAT_SUMMARIZED
                                            data: { "summary": "AI 처리 완료", "keywords": ["AI", "요약"] }
                                            """))),
                    @ApiResponse(responseCode = "401", description = "인증 실패 또는 토큰 누락"),
                    @ApiResponse(responseCode = "403", description = "해당 Room 접근 권한 없음"),
                    @ApiResponse(responseCode = "404", description = "Room을 찾을 수 없음")
            }
    )
    @GetMapping(value = "/{roomId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter connect(
            @Parameter(description = "구독할 Room의 고유 ID", example = "3") @PathVariable Long roomId,
            @Parameter(hidden = true) @AuthenticationPrincipal CustomMemberDetails member) {
        if (member == null) {
            log.warn("[SSE] Unauthorized connection attempt to room {}", roomId);
            SseEmitter dummy = new SseEmitter(1000L);
            try {
                dummy.send(SseEmitter.event()
                        .name("ERROR")
                        .data("Unauthorized connection"));
            } catch (IOException ignored) {}

            dummy.complete();
            return dummy;
        }

        // 해당 채팅방의 소유자인지 검증
        roomService.isOwner(member.getMemberUid(), roomId);

        log.info("[SSE] Member {} connected to room {}", member.getUsername(), roomId);

        SseEmitter emitter = sseEmitterManager.createEmitterByRoom(roomId);

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

    @Operation(
            summary = "SSE 연결 종료",
            description = """
                    특정 Room의 SSE 연결을 강제로 종료합니다.  
                    클라이언트가 수동으로 스트림을 닫거나, 세션 만료 시 호출합니다.
                    """,
            responses = {
                    @ApiResponse(responseCode = "200", description = "SSE 연결 종료 완료",
                            content = @Content(
                                    examples = @ExampleObject(value = """
                                            {
                                              "message": "Disconnected from room 3"
                                            }
                                            """))),
                    @ApiResponse(responseCode = "401", description = "인증 실패"),
                    @ApiResponse(responseCode = "403", description = "해당 Room 접근 권한 없음")
            }
    )
    @DeleteMapping("/{roomId}")
    public void disconnect(
            @Parameter(description = "연결 종료할 Room의 고유 ID", example = "3") @PathVariable Long roomId,
            @Parameter(hidden = true) @AuthenticationPrincipal CustomMemberDetails member) {
        if (member == null) {
            throw new ApiException(ErrorCode.SSE_UNAUTHORIZED);
        }

        // 해당 채팅방의 소유자인지 검증
        roomService.isOwner(member.getMemberUid(), roomId);

        sseEmitterManager.removeRoomEmitter(roomId, "completed");
        log.info("[SSE] Member {} disconnected from room {}", member.getUsername(), roomId);
    }

    @GetMapping(value = "/session/{sessionUuid}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter connectBySession(
            @Parameter(description = "SSE 연결용 세션 UUID", example = "550e8400-e29b-41d4-a716-446655440000")
            @PathVariable String sessionUuid) {

        SseEmitter emitter = sseEmitterManager.createEmitterBySession(sessionUuid);
        log.info("[SSE] Session {} connected (pre-room)", sessionUuid);

        try {
            emitter.send(SseEmitter.event()
                    .name("INIT")
                    .data("Connected to session " + sessionUuid));
        } catch (Exception e) {
            log.warn("[SSE] INIT send failed for session {}: {}", sessionUuid, e.getMessage());
        }

        return emitter;
    }

    @DeleteMapping("/session/{sessionUuid}")
    public void disconnectBySession(
            @Parameter(description = "종료할 SSE 세션 UUID") @PathVariable String sessionUuid) {

        sseEmitterManager.removeSessionEmitter(sessionUuid, "completed");
        log.info("[SSE] Session {} manually disconnected", sessionUuid);
    }
}
