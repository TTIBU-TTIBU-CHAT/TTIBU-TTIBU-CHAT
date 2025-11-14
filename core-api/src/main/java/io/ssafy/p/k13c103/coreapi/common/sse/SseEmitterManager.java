package io.ssafy.p.k13c103.coreapi.common.sse;

import io.ssafy.p.k13c103.coreapi.domain.chat.dto.ChatSseEvent;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
public class SseEmitterManager {

    private static final Long DEFAULT_TIMEOUT = 60L * 1000 * 30;    // 타임아웃: 30분
    private static final long HEARTBEAT_INTERVAL = 15L;             // 하트비트(ping): 15초

    // roomId -> emitter (1:1 관계)
    private final Map<Long, SseEmitter> roomEmitters = new ConcurrentHashMap<>();
    private final Map<String, SseEmitter> sessionEmitters = new ConcurrentHashMap<>();

    private final ThreadPoolTaskScheduler scheduler;    // 하트비트 스케줄러 (스레드풀 기반)

    public SseEmitterManager() {
        this.scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(5);                       // 동시에 여러 emitter의 heartbeat 관리
        scheduler.setThreadNamePrefix("SSE-Heartbeat-");
        scheduler.initialize();
    }

    @PreDestroy
    public void shutdownScheduler() {
        scheduler.shutdown();
        log.info("[SSE] Heartbeat scheduler shut down");
    }

    public void migrateSessionEmitterToRoom(String sessionUuid, Long roomId) {
        SseEmitter emitter = sessionEmitters.remove(sessionUuid);
        if (emitter != null) {
            roomEmitters.put(roomId, emitter);
            log.info("[SSE] Migrated session {} → room {}", sessionUuid, roomId);
        } else {
            log.warn("[SSE] No emitter found for session {} (migration skipped)", sessionUuid);
        }
    }

    public SseEmitter createEmitterBySession(String sessionUuid) {
        SseEmitter emitter = new SseEmitter(DEFAULT_TIMEOUT);
        sessionEmitters.put(sessionUuid, emitter);
        log.info("[SSE] Session {} connected (pre-room)", sessionUuid);

        emitter.onCompletion(() -> removeSessionEmitter(sessionUuid, "completed"));
        emitter.onTimeout(() -> removeSessionEmitter(sessionUuid, "timed out"));
        emitter.onError(e -> removeSessionEmitter(sessionUuid, "error: " + e.getMessage()));

        startHeartbeatForSession(sessionUuid, emitter);
        return emitter;
    }

    public void removeSessionEmitter(String sessionUuid, String reason) {
        SseEmitter emitter = sessionEmitters.remove(sessionUuid);
        if (emitter != null) {
            try { emitter.complete(); } catch (Exception ignored) {}
            log.info("[SSE] Session {} emitter removed ({})", sessionUuid, reason);
        }
    }

    /* 새로운 SSE 연결 생성 및 저장 */
    public SseEmitter createEmitterByRoom(Long roomId) {
        SseEmitter emitter = new SseEmitter(DEFAULT_TIMEOUT);
        roomEmitters.put(roomId, emitter);
        log.info("[SSE] Room {} connected", roomId);

        emitter.onCompletion(() -> removeRoomEmitter(roomId, "completed"));
        emitter.onTimeout(() -> removeRoomEmitter(roomId, "timed out"));
        emitter.onError(e -> removeRoomEmitter(roomId, "error: " + e.getMessage()));

        startHeartbeat(roomId, emitter);
        return emitter;
    }

    /* 특정 roomId에 이벤트 전송 */
    public <T> void sendEvent(Long roomId, ChatSseEvent<T> event) {
        SseEmitter emitter = roomEmitters.get(roomId);

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
            log.error("[SSE] Failed to send event to room {}: {}", roomId, e.getMessage());
            removeRoomEmitter(roomId, "send failed");
        }
    }

    /* 연결 강제 종료 */
    public void removeRoomEmitter(Long roomId, String reason) {
        SseEmitter emitter = roomEmitters.remove(roomId);
        if (emitter != null) {
            try {
                emitter.complete();
            } catch (Exception ignored) {
            }
            log.info("[SSE] Room {} emitter removed ({})", roomId, reason);
        }
    }

    /**
     * 하트비트 스케줄링
     * - 15초마다 "heartbeat" 이벤트를 클라이언트로 보냄
     * - 실패 시 emitter 제거
     */
    private void startHeartbeat(Long roomId, SseEmitter emitter) {
        // ThreadPoolTaskScheduler 사용 → 15초마다 heartbeat 이벤트 전송
        scheduler.scheduleAtFixedRate(() -> {
            if (!roomEmitters.containsKey(roomId)) return;  // 이미 종료된 emitter는 skip

            try {
                // heartbeat 이벤트 전송
                emitter.send(SseEmitter.event()
                        .name("heartbeat")
                        .data("ping"));
                log.debug("[SSE] Heartbeat sent to room {}", roomId);
            } catch (Exception e) {
                // 전송 실패 시 emitter 제거 (끊긴 연결로 간주)
                log.warn("[SSE] Heartbeat failed for room {}, removing emitter", roomId);
                removeRoomEmitter(roomId, "completed");
            }
        }, TimeUnit.SECONDS.toMillis(HEARTBEAT_INTERVAL));
    }

    private void startHeartbeatForSession(String sessionUuid, SseEmitter emitter) {
        scheduler.scheduleAtFixedRate(() -> {
            if (!sessionEmitters.containsKey(sessionUuid)) return;
            try {
                emitter.send(SseEmitter.event().name("heartbeat").data("ping"));
                log.debug("[SSE] Heartbeat sent to session {}", sessionUuid);
            } catch (Exception e) {
                log.warn("[SSE] Heartbeat failed for session {}, removing emitter", sessionUuid);
                removeSessionEmitter(sessionUuid, "heartbeat failed");
            }
        }, TimeUnit.SECONDS.toMillis(HEARTBEAT_INTERVAL));
    }

}
