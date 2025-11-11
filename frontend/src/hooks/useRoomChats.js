import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { chatService } from '@/services/chatService';

// 쿼리키 헬퍼
const rk = {
  roomDetail: (roomId) => ['rooms', 'detail', roomId],
  roomChats:  (roomId) => ['rooms', 'chats', roomId],
  // ✅ 배열/페이지를 객체로 묶어 캐시 키 안정화
  search:     (keywords = [], page = 0, size = 20) => [
    'chats',
    'search',
    { keywords: [...keywords], page, size },
  ],
};

/** 그룹 붙이기: POST /rooms/{roomId}/attach-group */
export function useAttachGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars) => chatService.attachGroup(vars),
    onSuccess: (_res, vars) => {
      if (vars?.roomId) {
        qc.invalidateQueries({ queryKey: rk.roomDetail(vars.roomId) });
        qc.invalidateQueries({ queryKey: rk.roomChats(vars.roomId) });
      }
    },
  });
}

/** 기존 노드 복사→붙이기: POST /rooms/{roomId}/attach-chat */
export function useAttachChatFromExisting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars) => chatService.attachChatFromExisting(vars),
    onSuccess: (_res, vars) => {
      if (vars?.roomId) {
        qc.invalidateQueries({ queryKey: rk.roomDetail(vars.roomId) });
        qc.invalidateQueries({ queryKey: rk.roomChats(vars.roomId) });
      }
    },
  });
}

/** 새 채팅 붙이기: POST /rooms/{roomId}/chats */
export function useCreateChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars) => chatService.createChat(vars),
    onSuccess: (_res, vars) => {
      if (vars?.roomId) {
        qc.invalidateQueries({ queryKey: rk.roomChats(vars.roomId) });
        qc.invalidateQueries({ queryKey: rk.roomDetail(vars.roomId) });
      }
    },
  });
}

/** ✅ 채팅 검색: GET /api/v1/chats?k=&k=&page=&size= */
export function useSearchChats(keywords = [], page = 0, size = 20) {
  const enabled = Array.isArray(keywords) && keywords.length > 0;
  console.log("useSearchChats called with:", { keywords, page, size, enabled });
  return useQuery({
    queryKey: rk.search(keywords, page, size),
    queryFn: async () => {
      const json = await chatService.searchChats({ keywords, page, size });
      // 서버 래핑: { status, data }
      console.log("Search response:", json);
      if (json?.status === 'success') return json.data; // Page<SearchedResultInfo>
      const reason = json?.data?.reason || json?.message || '검색 요청에 실패했습니다.';
      throw new Error(reason);
    },
    enabled,
    staleTime: 30_000,
  });
}
