import { api } from "@services/api";

export const chatRoomService = {
  createRoom: (payload) => api.post("/rooms", payload), // 새 채팅방 생성

  listRooms: (params) => api.get("/rooms", { params }), // 채팅방 리스트 조회

  getRoom: (roomId) => api.get(`/rooms/${roomId}`), // 채팅 + 브랜치 정보 조회

  saveRoomData: ({ roomId, ...body }) => api.post(`/rooms/${roomId}`, body), // 채팅 + 브랜치 정보 저장

  renameRoom: ({ roomId, name }) =>
    api.patch(`/rooms/${roomId}/name`, { name }), // 채팅방 이름 수정

  deleteRoom: (roomId) => api.delete(`/rooms/${roomId}`), // 채팅방 삭제

  openStream: (roomId) => {
    // SSE 연결 생성
    const base = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";
    console.log("SSE 연결 URL:", `${base}/chats/stream/${roomId}`);
    return new EventSource(`${base}/chats/stream/${roomId}`, {
      withCredentials: true,
    });
  },

  closeStream: (roomId) => api.delete(`/chats/stream/${roomId}`), // SSE 연결 종료
};
