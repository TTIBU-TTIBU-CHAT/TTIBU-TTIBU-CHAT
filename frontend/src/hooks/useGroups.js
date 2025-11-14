import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { groupService } from '@/services/groupService'
import { useGroupStore } from '@/store/useGroupStore'

// 쿼리키 헬퍼
const gk = {
  all: ['groups'],
  list: (params) => ['groups', 'list', params ?? {}],
  detail: (id) => ['groups', 'detail', id],
  view: ['groups', 'view'],
}

// 리스트 조회
export function useGroups(params) {
  return useQuery({
    queryKey: gk.list(params),
    queryFn: async () => {
      const res = await groupService.list(params)
      console.log('[GROUP_LIST] fetched:', res.data)
      return res.data?.data ?? []
    },
    staleTime: 30_000,
  })
}

// 상세 조회
export function useGroup(groupId) {
  return useQuery({
    queryKey: gk.detail(groupId),
    queryFn: async () => {
      const res = await groupService.detail(groupId)
      return res.data?.data ?? {}
    },
    enabled: !!groupId,
    staleTime: 30_000,
  })
}

// 그룹 생성
export function useCreateGroup() {
  const qc = useQueryClient()
  const addGroupToView = useGroupStore((s) => s.addGroupToView)

  return useMutation({
    mutationFn: (payload) => groupService.create(payload),
    onSuccess: async (res) => {
      const newGroup = res.data?.data
      console.log('[GROUP_CREATE] 성공:', newGroup)
      if (newGroup) await addGroupToView(newGroup)
      qc.invalidateQueries({ queryKey: gk.all })
    },
  })
}

// 그룹 수정
export function useUpdateGroup() {
  const qc = useQueryClient()
  const updateGroupInView = useGroupStore((s) => s.updateGroupInView)

  return useMutation({
    mutationFn: (vars) => groupService.update(vars),
    onSuccess: async (res) => {
      const updatedGroup = res.data?.data
      console.log('[GROUP_UPDATE] 성공:', updatedGroup)
      if (updatedGroup) await updateGroupInView(updatedGroup)
      qc.invalidateQueries({ queryKey: gk.all })
    },
  })
}

// 그룹 이름 수정 (낙관적 업데이트 포함)
export function useRenameGroup() {
  const qc = useQueryClient()
  const updateGroupInView = useGroupStore((s) => s.updateGroupInView)

  return useMutation({
    mutationFn: ({ groupId, name }) => groupService.rename({ groupId, name }),
    onMutate: async ({ groupId, name }) => {
      await qc.cancelQueries({ queryKey: gk.detail(groupId) })
      const prev = qc.getQueryData(gk.detail(groupId))
      if (prev) qc.setQueryData(gk.detail(groupId), { ...prev, name })
      return { prev }
    },
    onError: (_e, { groupId }, ctx) => {
      if (ctx?.prev) qc.setQueryData(gk.detail(groupId), ctx.prev)
    },
    onSuccess: async (res) => {
      const renamed = res.data?.data
      console.log('[GROUP_RENAME] 성공:', renamed)
      if (renamed) await updateGroupInView(renamed)
    },
    onSettled: (_d, _e, { groupId }) => {
      qc.invalidateQueries({ queryKey: gk.detail(groupId) })
      qc.invalidateQueries({ queryKey: gk.all })
    },
  })
}

// 그룹 삭제
export function useDeleteGroup() {
  const qc = useQueryClient()
  const removeGroupFromView = useGroupStore((s) => s.removeGroupFromView)

  return useMutation({
    mutationFn: (groupId) => groupService.remove(groupId),
    onSuccess: async (res, groupId) => {
      console.log('[GROUP_DELETE] 성공:', res.data)
      await removeGroupFromView(groupId)
      qc.invalidateQueries({ queryKey: gk.all })
    },
  })
}
