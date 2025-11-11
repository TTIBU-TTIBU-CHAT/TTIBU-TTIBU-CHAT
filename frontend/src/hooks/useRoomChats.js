import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { chatService } from '@/services/chatService';

// 쿼리키 헬퍼
const rk = {
  roomDetail: (roomId) => ['rooms', 'detail', roomId], // 방 상세/캔버스 데이터 등
  roomChats:  (roomId) => ['rooms', 'chats', roomId],  // 방 채팅 리스트(있다면)
  search:     (q)      => ['chats', 'search', q ?? ''],      // 검색 결과
};

/** 그룹 붙이기: POST /rooms/{roomId}/attach-group */
export function useAttachGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars) => chatService.attachGroup(vars),
    onSuccess: (_res, vars) => {
      // 방 상세/뷰가 있다면 무효화해서 최신 반영
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
    // 필요하면 낙관적 업데이트 추가 가능 (주석 참고)
    // onMutate: async ({ roomId, text }) => {
    //   await qc.cancelQueries({ queryKey: rk.roomChats(roomId) });
    //   const prev = qc.getQueryData(rk.roomChats(roomId));
    //   const optimistic = { id: `tmp-${Date.now()}`, text, optimistic: true };
    //   if (prev) qc.setQueryData(rk.roomChats(roomId), [...prev, optimistic]);
    //   return { prev };
    // },
    // onError: (_e, { roomId }, ctx) => {
    //   if (ctx?.prev) qc.setQueryData(rk.roomChats(roomId), ctx.prev);
    // },
    onSuccess: (_res, vars) => {
      if (vars?.roomId) {
        qc.invalidateQueries({ queryKey: rk.roomChats(vars.roomId) });
        qc.invalidateQueries({ queryKey: rk.roomDetail(vars.roomId) });
      }
    },
  });
}

/** 채팅 검색: POST /chats?keyword= */
export function useSearchChats(keyword, body) {
  return useQuery({
    queryKey: rk.search(keyword ?? ''),
    queryFn: async () => {
      const res = await chatService.searchChats({ keyword, ...(body || {}) });
      return res.data; // 서버 응답 스키마에 맞춰 사용
    },
    enabled: !!keyword, // 키워드가 있을 때만 실행
    staleTime: 30_000,
  });
}
