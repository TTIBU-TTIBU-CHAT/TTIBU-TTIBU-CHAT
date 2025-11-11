import { api } from '@services/api';

export const chatService = {
  attachGroup: ({ roomId, ...payload }) =>
    api.post(`/rooms/${roomId}/attach-group`, payload),

  attachChatFromExisting: ({ roomId, ...payload }) =>
    api.post(`/rooms/${roomId}/attach-chat`, payload),

  createChat: ({ roomId, ...payload }) =>
    api.post(`/rooms/${roomId}/chats`, payload),

  /** ✅ GET /api/v1/chats?k=&k=&page=&size= (JSESSIONID 쿠키 필요) */
  async searchChats({ keywords, page = 0, size = 20 }) {
    if (!Array.isArray(keywords) || keywords.length === 0) {
      throw new Error('검색할 키워드가 없습니다.');
    }
    if (keywords.length > 10) {
      throw new Error('검색할 키워드가 10개 초과입니다.');
    }

    const params = new URLSearchParams();
    keywords.forEach((k) => params.append('k', k));
    params.set('page', String(page));
    params.set('size', String(size));

    // NOTE: api 인스턴스의 baseURL이 이미 /api/v1라면 아래를 `/chats?...`로 바꿔도 됩니다.
    const url = `/api/v1/chats?${params.toString()}`;

    const res = await api.get(url, {
      withCredentials: true, // Cookie: JSESSIONID=...
    });
    return res.data; // { status, data }
  },
};
