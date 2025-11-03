package io.ssafy.p.k13c103.coreapi.common.sse;

import io.ssafy.p.k13c103.coreapi.domain.chat.dto.ChatSseEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class SseEmitterManager {

    private static final Long DEFAULT_TIMEOUT = 60L * 1000 * 60;    // 60분
    // roomId -> emitter (1:1)
    private final Map<Long, SseEmitter> emitters = new ConcurrentHashMap<>();

    /* 새로운 SSE 연결 생성 및 저장 */
    public SseEmitter createEmitter(Long roomId) {
        SseEmitter emitter = new SseEmitter(DEFAULT_TIMEOUT);

        emitters.put(roomId, emitter);

        // 연결 종료 or 타임아웃 시 emitter 제거
        emitter.onCompletion(() -> {
            emitters.remove(roomId);
            log.info("[SSE] Room {} connection completed", roomId);
        });

        emitter.onTimeout(() -> {
            emitters.remove(roomId);
            log.info("[SSE] Room {} connection timed out", roomId);
        });

        log.info("[SSE] Room {} connected", roomId);
        return emitter;
    }

    /* 특정 roomId에 이벤트 전송 */
     public <T> void sendEvent(Long roomId, ChatSseEvent<T> event) {
        SseEmitter emitter = emitters.get(roomId);

        if (emitter == null) {
            log.warn("[SSE] No active emitter found for room {}", roomId);
            return;
        }

        try {
            emitter.send(SseEmitter.event()
                    .name(event.getType().name())   // ChatSseEventType
                    .data(event)
            );
            log.info("[SSE] Event sent to room {} => {}", roomId, event.getType());
        } catch (IOException e) {
            emitters.remove(roomId);
            log.error("[SSE] Failed to send event to room {}: {}", roomId, e.getMessage());
        }
     }

     /* 연결 강제 종료 */
     public void removeEmitter(Long roomId) {
         emitters.remove(roomId);
         log.info("[SSE] Room {} emitter removed manually", roomId);
     }

     /* emitter 존재 여부 확인 */
     public boolean hasEmitter(Long roomId) {
         return emitters.containsKey(roomId);
     }
}
