// store/useSSEStore.js
import { create } from "zustand";
import { chatRoomService } from "@/services/chatRoomService";

export const useSSEStore = create((set, get) => ({
  sessionUuid: null,
  es: null,
  connected: false,
  lastMessage: null,

  setSession: (sid) => set({ sessionUuid: sid }),

  connect: (sid) => {
    const { es, sessionUuid } = get();
    if (!sid) return;
    // 같은 세션으로 이미 연결되어 있으면 스킵
    if (es && sessionUuid === sid && get().connected) return;

    // 기존 연결 종료
    if (es) {
      try { es.close(); } catch {}
      set({ es: null, connected: false });
    }

    const next = chatRoomService.openStream(sid);
    set({ es: next, sessionUuid: sid });

    next.addEventListener("open", () => set({ connected: true }));
    next.addEventListener("error", (e) => {
      console.error("[SSE error]", e);
      // 브라우저가 자동 재연결
    });
  },

  disconnect: async () => {
    const { es, sessionUuid } = get();
    if (es) {
      try { es.close(); } catch {}
      set({ es: null, connected: false });
      try { await chatRoomService.closeStreamBySession?.(sessionUuid); } catch {}
    }
  },

  setLastMessage: (msg) => set({ lastMessage: msg }),

  /**
   * 현재 es에 핸들러 바인딩. cleanup을 위한 off 함수 반환.
   * 여러 컴포넌트에서 동시 구독 가능(각자 attach/cleanup)
   */
  attachHandlers: (handlers = {}) => {
    const es = get().es;
    if (!es) return () => {};

    const parse = (s) => {
      try { return JSON.parse(s); } catch { return s; }
    };
    const setLastMessage = get().setLastMessage;
    const map = [];

    const bind = (type, fn) => {
      // 핸들러가 없어도 바인딩해서 로깅/상태는 항상 업데이트
      const wrapped = (evt) => {
        const payload = parse(evt.data);
        setLastMessage({ type, payload });
        console.log(`[SSE ${type}]`, payload);
        fn && fn(payload);
      };
      es.addEventListener(type, wrapped);
      map.push({ type, wrapped });
    };

    // 서버 이벤트들
    bind("INIT", (data) => {
      handlers.onRoomCreated?.(
        typeof data === "string" ? { message: data } : data
      );
    });
    bind("heartbeat", handlers.onHeartbeat);
    bind("ROOM_CREATED", handlers.onRoomCreated);
    bind("CHAT_STREAM", handlers.onChatStream);
    bind("CHAT_DONE", handlers.onChatDone);
    bind("ROOM_SHORT_SUMMARY", handlers.onRoomShortSummary);
    bind("CHAT_SUMMARY_KEYWORDS", handlers.onChatSummaryKeywords);
    bind("CHAT_ERROR", handlers.onChatError);

    // 기본 message 채널(이벤트명이 없는 경우)
    const onMessage = (evt) => {
      const msg = parse(evt.data);
      setLastMessage({ type: "message", payload: msg });
      handlers.onMessage?.(msg);
    };
    es.addEventListener("message", onMessage);
    map.push({ type: "message", wrapped: onMessage });

    // open / error (옵션)
    const onOpen = (evt) => handlers.onOpen?.(evt);
    const onError = (evt) => handlers.onError?.(evt);
    es.addEventListener("open", onOpen);
    es.addEventListener("error", onError);
    map.push({ type: "open", wrapped: onOpen });
    map.push({ type: "error", wrapped: onError });

    // off()
    return () => {
      const current = get().es;
      if (!current) return;
      map.forEach(({ type, wrapped }) =>
        current.removeEventListener(type, wrapped)
      );
    };
  },
}));
