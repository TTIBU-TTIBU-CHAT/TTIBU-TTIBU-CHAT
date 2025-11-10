import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { groupService } from '@/services/groupService';

// 쿼리키 헬퍼
const gk = {
  all: ['groups'],
  list: (params) => ['groups', 'list', params ?? {}],
  detail: (id) => ['groups', 'detail', id],
  view: ['groups', 'view'],
};

// 리스트 조회
export function useGroups(params) {
  return useQuery({
    queryKey: gk.list(params),
    queryFn: async () => {
      const res = await groupService.list(params);
      console.log('Fetched groups:', res.data);
      return res.data; // 배열 또는 {items, nextCursor} 등 서버 스펙에 맞춰 사용
    },
    staleTime: 30_000,
  });
}

// 상세 조회
export function useGroup(groupId) {
  return useQuery({
    queryKey: gk.detail(groupId),
    queryFn: async () => {
      const res = await groupService.detail(groupId);
      return res.data;
    },
    enabled: !!groupId,
    staleTime: 30_000,
  });
}

// 생성
export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => groupService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gk.all });
    },
  });
}

// 부분 수정
export function useUpdateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars) => groupService.update(vars),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: gk.detail(vars.groupId) });
      qc.invalidateQueries({ queryKey: gk.all });
    },
  });
}

// 이름만 수정 (낙관적 업데이트 포함)
export function useRenameGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, name }) => groupService.rename({ groupId, name }),
    onMutate: async ({ groupId, name }) => {
      await qc.cancelQueries({ queryKey: gk.detail(groupId) });
      const prev = qc.getQueryData(gk.detail(groupId));
      if (prev) qc.setQueryData(gk.detail(groupId), { ...prev, name });
      return { prev };
    },
    onError: (_e, { groupId }, ctx) => {
      if (ctx?.prev) qc.setQueryData(gk.detail(groupId), ctx.prev);
    },
    onSettled: (_d, _e, { groupId }) => {
      qc.invalidateQueries({ queryKey: gk.detail(groupId) });
      qc.invalidateQueries({ queryKey: gk.all });
    },
  });
}

// 삭제
export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (groupId) => groupService.remove(groupId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gk.all });
    },
  });
}

// 그룹 JSON(View) 조회/저장
export function useGroupView() {
  return useQuery({
    queryKey: gk.view,
    queryFn: async () => {
      const res = await groupService.getView();
      return res.data; // ReactFlow JSON 등
    },
    staleTime: 0,
  });
}

export function useSaveGroupView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (json) => groupService.saveView(json),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gk.view });
    },
  });
}
