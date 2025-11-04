package io.ssafy.p.k13c103.coreapi.common.sse;

import io.ssafy.p.k13c103.coreapi.domain.chat.dto.ChatSseEvent;
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
    private final Map<Long, SseEmitter> emitters = new ConcurrentHashMap<>();

    private final ThreadPoolTaskScheduler scheduler;    // 하트비트 스케줄러 (스레드풀 기반)

    public SseEmitterManager() {
        this.scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(5);                       // 동시에 여러 emitter의 heartbeat 관리
        scheduler.setThreadNamePrefix("SSE-Heartbeat-");
        scheduler.initialize();
    }

    /* 새로운 SSE 연결 생성 및 저장 */
    public SseEmitter createEmitter(Long roomId) {
        SseEmitter emitter = new SseEmitter(DEFAULT_TIMEOUT);

        emitters.put(roomId, emitter);
        log.info("[SSE] Room {} connected", roomId);

        // 클라이언트에서 연결 종료 시 emitter 제거
        emitter.onCompletion(() -> {
            emitters.remove(roomId);
            log.info("[SSE] Room {} connection completed", roomId);
        });

        // 타임아웃 시 emitter 제거
        emitter.onTimeout(() -> {
            emitters.remove(roomId);
            log.info("[SSE] Room {} connection timed out", roomId);
        });

        // 에러 발생 시 emitter 제거
        emitter.onError((e) -> {
            log.error("[SSE] Error on emitter for roomId={} - {}", roomId, e.getMessage());
            removeEmitter(roomId);
        });

        startHeartbeat(roomId, emitter);

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

    /* 연결 강제 종료 (수동) */
    public void removeEmitter(Long roomId) {
        SseEmitter emitter = emitters.remove(roomId);
        if (emitter != null) {
            try {
                emitter.complete();
            } catch (Exception ignored) {

            }

            log.info("[SSE] Room {} emitter removed manually", roomId);
        }
    }

    /* emitter 존재 여부 확인 (모니터링용) */
    public boolean hasEmitter(Long roomId) {
        return emitters.containsKey(roomId);
    }

    /* 현재 연결된 emitter 개수 확인 (모니터링용) */
    public int getActiveEmitterCount() {
        return emitters.size();
    }

    /**
     * 하트비트 스케줄링
     * - 15초마다 "heartbeat" 이벤트를 클라이언트로 보냄
     * - 실패 시 emitter 제거
     */
    private void startHeartbeat(Long roomId, SseEmitter emitter) {
        // ThreadPoolTaskScheduler 사용 → 15초마다 heartbeat 이벤트 전송
        scheduler.scheduleAtFixedRate(() -> {
            if (!emitters.containsKey(roomId)) return;  // 이미 종료된 emitter는 skip

            try {
                // heartbeat 이벤트 전송
                emitter.send(SseEmitter.event()
                        .name("heartbeat")
                        .data("ping"));
                log.debug("[SSE] Heartbeat sent to room {}", roomId);
            } catch (Exception e) {
                // 전송 실패 시 emitter 제거 (끊긴 연결로 간주)
                log.warn("[SSE] Heartbeat failed for room {}, removing emitter", roomId);
                removeEmitter(roomId);
            }
        }, TimeUnit.SECONDS.toMillis(HEARTBEAT_INTERVAL));
    }
}
