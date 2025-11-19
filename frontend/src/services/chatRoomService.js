// src/services/chatRoomService.js
import { api } from "@services/api";

export const chatRoomService = {
  // 방 생성(반드시 sessionUuid를 body에 포함)
  createRoom: (payload) => api.post("/rooms", payload),

  listRooms: (params) => api.get("/rooms", { params }),
  getRoom: (roomId) => api.get(`/rooms/${roomId}`),

  /**
   * ✅ 저장: multipart/form-data 로 chatInfo / branchView 전송
   * vars: { roomId, chatInfo, branchView }  (chatInfo/branchView는 JSON string)
   */
  saveRoomData: ({ roomId, chatInfo, branchView }) => {
    const form = new FormData();
    // 서버 스펙: key 이름이 정확히 chatInfo, branchView 여야 함
    form.append(
      "chatInfo",
      new Blob([chatInfo], { type: "text/plain" }),
      "chatInfo.json"
    );
    form.append(
      "branchView",
      new Blob([branchView], { type: "text/plain" }),
      "branchView.json"
    );
    console.log("Saving room data:", { roomId, chatInfo, branchView });
    return api.post(`/rooms/${roomId}`, form, {
    });
  },

  renameRoom: ({ roomId, name }) =>
    api.patch(`/rooms/${roomId}/name`, { name }),

  deleteRoom: (roomId) => api.delete(`/rooms/${roomId}`),

  /**
   * ✅ SSE는 sessionUuid로만 연다
   * GET /chats/stream/session/{sessionUuid}
   */
  openStream: (sessionUuid) => {
    if (!sessionUuid) throw new Error("openStream requires sessionUuid");
    const base = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";
    const url = `${base}/chats/stream/session/${sessionUuid}`;
    console.log("SSE 연결 URL:", url);
    return new EventSource(url, { withCredentials: true });
  },
  openChatStream: (roomId) => {
    if (!roomId) throw new Error("openStream requires sessionUuid");
    const base = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";
    const url = `${base}/chats/stream/${roomId}`;
    console.log("SSE 연결 URL:", url);
    return new EventSource(url, { withCredentials: true });
  },

  // 선택: 서버가 종료 API 제공하면 사용
  closeStreamBySession: (sessionUuid) =>
    api.delete(`/chats/stream/session/${sessionUuid}`),
  closeStreamByChat: (roomId) =>
    api.delete(`/chats/stream/${roomId}`),
};
