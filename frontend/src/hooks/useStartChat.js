// hooks/useStartChat.js
import { useState } from "react";
import { chatRoomService } from "@/services/chatRoomService";
import { useSSEStore } from "@/store/useSSEStore";
import { useRoomStream } from "@/hooks/useRoomStream";

/**
 * 흐름:
 * - sessionUuid 생성 → 전역 SSE 먼저 연결
 * - POST /rooms (body에 sessionUuid 포함)
 * - 서버가 해당 세션으로 ROOM_CREATED/CHAT_* 이벤트 push
 */
export function useStartChat(handlers = {}) {
  const [roomId, setRoomId] = useState(null);
  const [sessionUuid, setSessionUuid] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { connect } = useSSEStore();
  // 전역 연결 재사용 + 이 컴포넌트의 핸들러만 구독
  const { connected, lastMessage } = useRoomStream(sessionUuid, handlers);

  const start = async (payload) => {
    if (submitting) return null;
    setSubmitting(true);

    // 1) sessionUuid 생성 & 전역 SSE 먼저 연결
    const su = crypto.randomUUID();
    setSessionUuid(su);
    connect(su);

    try {
      // 2) 방 생성 (sessionUuid 포함)
      const body = { ...payload, sessionUuid: su };
      console.log("[POST /rooms] 요청 페이로드:", body);
      const res = await chatRoomService.createRoom(body);
      console.log("[POST /rooms] 응답:", res);

      const rid = res?.data?.data?.room_id;
      if (rid) setRoomId(rid);
      return rid ?? null;
    } catch (e) {
      console.error("새 채팅 시작 실패:", e);
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    start,
    roomId,
    sessionUuid,
    submitting,
    connected,
    lastMessage,
  };
}
