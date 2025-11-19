// hooks/useRoomChatStream.js
import { useEffect } from "react";
import { useSSEStore } from "@/store/useSSEStore";

/**
 * ✅ roomId 기반 SSE 스트림
 * GET /chats/stream/{roomId}
 *
 * 전제:
 * - useSSEStore 안에 connectByRoom 같은 함수가 있고,
 *   내부에서 chatRoomService.openChatStream(roomId)를 쓰도록 구현
 *   (이 부분은 store 코드에서 추가 구현이 필요함 → 확실하지 않음)
 */
export function useRoomChatStream(roomId, handlers = {}) {
  const setRoom      = useSSEStore((s) => s.setRoomId);        // 예: 현재 roomId 보관
  const connectRoom  = useSSEStore((s) => s.connectRoom);  // roomId용 connect
  const attachHandlers = useSSEStore((s) => s.attachHandlers);
  const connected    = useSSEStore((s) => s.connected);
  const lastMessage  = useSSEStore((s) => s.lastMessage);
  const es           = useSSEStore((s) => s.es);

  useEffect(() => {
    if (!roomId) return;
    setRoom(roomId);
    connectRoom(roomId); // 내부: chatRoomService.openChatStream(roomId)
  }, [roomId, setRoom, connectRoom]);

  useEffect(() => {
    if (!es) return;
    const off = attachHandlers(handlers);
    return () => off && off();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [es, attachHandlers]);

  return { connected, lastMessage };
}
