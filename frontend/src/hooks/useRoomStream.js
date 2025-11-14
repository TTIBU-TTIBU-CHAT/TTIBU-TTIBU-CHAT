// hooks/useRoomStream.js
import { useEffect } from "react";
import { useSSEStore } from "@/store/useSSEStore";

export function useRoomStream(sessionUuid, handlers = {}) {
  // ✅ 각 필드를 “개별” selector로 구독 (객체 리턴 금지)
  const setSession     = useSSEStore((s) => s.setSession);
  const connect        = useSSEStore((s) => s.connect);
  const attachHandlers = useSSEStore((s) => s.attachHandlers);
  const connected      = useSSEStore((s) => s.connected);
  const lastMessage    = useSSEStore((s) => s.lastMessage);
  const es             = useSSEStore((s) => s.es);

  // 세션 반영 & 연결 (같은 sid면 내부에서 스킵)
  useEffect(() => {
    if (!sessionUuid) return;
    setSession(sessionUuid);
    connect(sessionUuid);
  }, [sessionUuid, setSession, connect]);

  // 🔑 es가 준비된 “후” 한 번 바인딩
  //  - handlers는 의존성에서 제외(무한 재바인딩 방지)
  useEffect(() => {
    if (!es) return;
    const off = attachHandlers(handlers);
    return () => off && off();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [es, attachHandlers]);

  return { connected, lastMessage };
}
