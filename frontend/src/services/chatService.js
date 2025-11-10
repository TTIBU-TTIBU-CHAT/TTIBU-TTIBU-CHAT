import { api } from '@services/api';

export const chatService = {
  attachGroup: ({ roomId, ...payload }) => // 그룹 붙이기
    api.post(`/rooms/${roomId}/attach-group`, payload),

  attachChatFromExisting: ({ roomId, ...payload }) => // 기존 노드 복사 → 붙이기
    api.post(`/rooms/${roomId}/attach-chat`, payload),

  createChat: ({ roomId, ...payload }) => // 새 채팅 붙이기
    api.post(`/rooms/${roomId}/chats`, payload),

  searchChats: ({ keyword, ...payload }) => // 채팅 검색
    api.post(`/chats`, payload, { params: { keyword } }),
};
