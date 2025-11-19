// store/useSSEStore.js
import { create } from "zustand";
import { chatRoomService } from "@/services/chatRoomService";

export const useSSEStore = create((set, get) => ({
  // 식별자들
  sessionUuid: null,
  roomId: null,

  // 공통 SSE 상태
  es: null,
  connected: false,
  lastMessage: null,

  // 현재 어떤 기준으로 연결되어 있는지
  // 'session' | 'room' | null
  streamType: null,

  /* ------------------------ 식별자 세터 ------------------------ */
  setSession: (sid) => set({ sessionUuid: sid }),
  setRoomId: (roomId) => set({ roomId }),

  /* ------------------------ 세션 기반 연결 ------------------------ */
  connect: (sid) => {
    const { es, sessionUuid } = get();
    if (!sid) return;

    // 같은 세션으로 이미 연결되어 있으면 스킵
    if (
      es &&
      sessionUuid === sid &&
      get().connected &&
      get().streamType === "session"
    ) {
      return;
    }

    // 기존 연결 종료 (브라우저 쪽만)
    if (es) {
      try {
        es.close();
      } catch {}
      set({ es: null, connected: false });
    }

    // ✅ 세션 기반 SSE 열기
    const next = chatRoomService.openStream(sid);
    set({
      es: next,
      sessionUuid: sid,
      streamType: "session",
    });

    console.log("SSE(session) 연결되어브렀어:", sid);

    next.addEventListener("open", () => set({ connected: true }));
    next.addEventListener("error", (e) => {
      console.error("[SSE error(session)]", e);
      // 브라우저가 알아서 재연결 시도
      set({ connected: false });
    });
  },

  /* ------------------------ roomId 기반 연결 ------------------------ */
  connectRoom: (roomId) => {
    const { es, roomId: currentRoomId } = get();
    if (!roomId) return;

    // 같은 roomId로 이미 연결되어 있으면 스킵
    if (
      es &&
      currentRoomId === roomId &&
      get().connected &&
      get().streamType === "room"
    ) {
      return;
    }

    // 기존 연결 종료 (브라우저 쪽만)
    if (es) {
      try {
        es.close();
      } catch {}
      set({ es: null, connected: false });
    }

    // ✅ roomId 기반 SSE 열기
    const next = chatRoomService.openChatStream(roomId);
    set({
      es: next,
      roomId,
      streamType: "room",
    });

    console.log("SSE(room) 연결되어브렀어:", roomId);

    next.addEventListener("open", () => set({ connected: true }));
    next.addEventListener("error", (e) => {
      console.error("[SSE error(room)]", e);
      // 🔥 연결이 끊긴 상태라고 플래그를 내려줘야
      //   - handleSend 에서 재연결을 시도하고
      //   - ChatFlowPage useEffect도 다시 돌 수 있음
      set({ connected: false });
    });
  },

  /* ------------------------ 공통 disconnect ------------------------ */
  disconnect: async () => {
    const { es, sessionUuid, roomId, streamType } = get();

    // 브라우저 EventSource 닫기
    if (es) {
      try {
        es.close();
      } catch {}
      set({ es: null, connected: false });
    }

    // 서버측 스트림 종료 API 호출
    try {
      if (streamType === "session" && sessionUuid) {
        await chatRoomService.closeStreamBySession?.(sessionUuid);
      } else if (streamType === "room" && roomId != null) {
        await chatRoomService.closeStreamByChat?.(roomId);
      }
    } catch (e) {
      console.error("[SSE disconnect API error]", e);
    } finally {
      set({ streamType: null });
    }
  },

  /* ------------------------ lastMessage ------------------------ */
  setLastMessage: (msg) => set({ lastMessage: msg }),

  /**
   * 현재 es에 핸들러 바인딩. cleanup을 위한 off 함수 반환.
   * 여러 컴포넌트에서 동시 구독 가능(각자 attach/cleanup)
   */
  attachHandlers: (handlers = {}) => {
    const es = get().es;
    if (!es) return () => {};

    const parse = (s) => {
      try {
        return JSON.parse(s);
      } catch {
        return s;
      }
    };
    const setLastMessage = get().setLastMessage;
    const map = [];

    const bind = (type, fn) => {
      // 핸들러가 없어도 바인딩해서 로깅/상태는 항상 업데이트
      const wrapped = (evt) => {
        console.log(`[SSE ${type}]`, evt);
        const payload = parse(evt.data);
        setLastMessage({ type, payload });
        fn && fn(payload);
      };
      es.addEventListener(type, wrapped);
      map.push({ type, wrapped });
    };

    // 서버 이벤트들
    bind("INIT", (data) => {
      console.log("[SSE INIT???]", data);
      handlers.onRoomCreated?.(
        typeof data === "string" ? { message: data } : data
      );
    });
    bind("heartbeat", handlers.onHeartbeat);
    bind("ROOM_CREATED", handlers.onRoomCreated);
    bind("QUESTION_CREATED", handlers.onQuestionCreated);
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
