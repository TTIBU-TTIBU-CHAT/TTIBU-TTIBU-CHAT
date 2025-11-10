// useStartChat.js
import { useState } from 'react';
import { chatRoomService } from '@/services/chatRoomService';
import { useRoomStream } from '@/hooks/useRoomStream';

export function useStartChat(handlers = {}) {
  const [roomId, setRoomId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // 방 생성 후 그 roomId로 스트림 연결
  const { connect, disconnect, connected, lastMessage } = useRoomStream(roomId, handlers);

  const start = async (payload) => {
    if (submitting) return null;
    setSubmitting(true);
    try {
      console.log('[POST /rooms] 요청 페이로드:', payload);
      const res = await chatRoomService.createRoom(payload); // POST /rooms
      console.log('[POST /rooms] 응답:', res);
      const rid = res?.data?.data?.room_id;
      if (!rid) {
        console.error('room_id 없음:', res?.data);
        setSubmitting(false);
        return null;
      }
      setRoomId(rid);

      return rid;
    } catch (e) {
      console.error('새 채팅 시작 실패:', e);
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  return { start, roomId, submitting, connect, disconnect, connected, lastMessage };
}
