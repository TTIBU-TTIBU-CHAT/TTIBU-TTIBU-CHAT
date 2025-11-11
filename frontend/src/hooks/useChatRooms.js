import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatRoomService } from '@/services/chatRoomService';

/* ---------------------- Query Keys ---------------------- */
export const rk = {
  all: ['rooms'],
  list: (params) => ['rooms', 'list', params ?? {}],
  detail: (id) => ['rooms', 'detail', id],
};

/* ---------------------- 리스트 조회 ---------------------- */
export function useRooms(params) {
  return useQuery({
    queryKey: rk.list(params),
    queryFn: async () => {
      const res = await chatRoomService.listRooms(params);
      console.log('Fetched rooms:', res.data.rooms);
      return res.data.rooms; 
    },
    staleTime: 30_000,
  });
}

/* ---------------------- 채팅 + 브랜치 정보 조회 ---------------------- */
export function useRoom(roomId) {
  return useQuery({
    queryKey: rk.detail(roomId),
    queryFn: async () => {
      const res = await chatRoomService.getRoom(roomId);
      return res.data; // {room, chats, branches} (확실하지 않음)
    },
    enabled: !!roomId,
    staleTime: 30_000,
  });
}

/* ---------------------- 새 채팅방 생성 ---------------------- */
export function useCreateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => chatRoomService.createRoom(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: rk.all }),
  });
}

/* ---------------------- 채팅 + 브랜치 정보 저장 ---------------------- */
export function useSaveRoomData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars) => chatRoomService.saveRoomData(vars),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: rk.detail(vars.roomId) });
    },
  });
}

/* ---------------------- 이름 수정 ---------------------- */
export function useRenameRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ roomId, name }) =>
      chatRoomService.renameRoom({ roomId, name }),
    // 낙관적 업데이트
    onMutate: async ({ roomId, name }) => {
      await qc.cancelQueries({ queryKey: rk.detail(roomId) });
      const prev = qc.getQueryData(rk.detail(roomId));
      if (prev) qc.setQueryData(rk.detail(roomId), { ...prev, name });
      return { prev };
    },
    onError: (_e, { roomId }, ctx) => {
      if (ctx?.prev) qc.setQueryData(rk.detail(roomId), ctx.prev);
    },
    onSettled: (_d, _e, { roomId }) => {
      qc.invalidateQueries({ queryKey: rk.detail(roomId) });
      qc.invalidateQueries({ queryKey: rk.all });
    },
  });
}

/* ---------------------- 삭제 ---------------------- */
export function useDeleteRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (roomId) => chatRoomService.deleteRoom(roomId),
    onSuccess: () => qc.invalidateQueries({ queryKey: rk.all }),
  });
}
