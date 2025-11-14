import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { groupService } from '@/services/groupService'

export const useGroupStore = create(
  persist(
    (set, get) => ({
      groupView: null,
      loading: false,
      error: null,
      initialized: false,    // persist 하이드레이션 완료 여부

      // 로그인 후 group_view 동기화
      initialize: async () => {
        set({ loading: true, error: null })
        try {
          const res = await groupService.getGroupView()
          let data = res?.data?.data
          console.log('[GROUP_VIEW] 서버 응답:', data)
          if (typeof data === 'string') {
            try {
              data = JSON.parse(data)
            } catch {
              console.warn('[GROUP_VIEW] data 문자열 파싱 실패 → 빈 객체로 처리')
              data = {}
            }
          }

          // 서버에 group_view가 없을 경우 -> 빈 group_view 생성
          if (!data || Object.keys(data).length === 0) {
            console.log('[GROUP_VIEW] 데이터 없음 → 빈 group_view 생성 시도')
            const emptyView = {
              max_groups: 10,
              groups: [],
              last_updated: new Date().toISOString(),
            }
            await groupService.updateGroupView(emptyView)
            console.log('[GROUP_VIEW] 서버에 없어서 새로 생성됨:', emptyView)
            set({ groupView: emptyView })
          } else {
            console.log('[GROUP_VIEW] 서버에서 불러온 group_view:', data)
            set({ groupView: data })
          }
        } catch (err) {
          console.error('[GROUP_VIEW] 초기화 실패:', err)
          set({ error: err })
        } finally {
          set({ loading: false, initialized: true })
        }
      },

      // 그룹 JSON 덮어쓰기 
      saveGroupView: async (updated) => {
        try {
          const res = await groupService.updateGroupView(updated)
          if (res?.data?.updated_at) {
            set({
              groupView: { ...updated, last_updated: res.data.updated_at },
            })
          } else {
            set({ groupView: updated })
          }
        } catch (err) {
          console.error('[GROUP_VIEW] 저장 실패:', err)
        }
      },

      // 그룹 생성 후 view 반영 
      addGroupToView: async (newGroupData) => {
        const pastelColors = ['#C8E6C9', '#BBDEFB', '#FFF59D', '#FFCCBC', '#E1BEE7', '#F8BBD0']
        const color = pastelColors[Math.floor(Math.random() * pastelColors.length)]
        const { groupView } = get()

        const updatedView = groupView ?? { max_groups: 10, groups: [], last_updated: new Date().toISOString() }

        const newGroup = {
          group_id: newGroupData.groupId,
          name: newGroupData.name,
          origin_nodes: newGroupData.originNodes,
          copied_nodes: newGroupData.copiedNodes,
          color,
        }

        const newGroups = [...updatedView.groups, newGroup]
        const newGroupView = { ...updatedView, groups: newGroups, last_updated: new Date().toISOString() }

        await get().saveGroupView(newGroupView)
      },

      // 그룹 수정 후 view 반영
      updateGroupInView: async (updatedGroupData) => {
        const { groupView } = get()
        if (!groupView) return

        const updatedGroups = groupView.groups.map((g) =>
          g.group_id === updatedGroupData.groupId
            ? {
                ...g,
                name: updatedGroupData.name ?? g.name,
                origin_nodes: updatedGroupData.originNodes ?? g.origin_nodes,
                copied_nodes: updatedGroupData.copiedNodes ?? g.copied_nodes,
              }
            : g
        )

        const newGroupView = {
          ...groupView,
          groups: updatedGroups,
          last_updated: new Date().toISOString(),
        }

        await get().saveGroupView(newGroupView)
      },

      // 그룹 삭제 후 view 반영
      removeGroupFromView: async (groupId) => {
        const { groupView } = get()
        if (!groupView) return

        const newGroups = groupView.groups.filter((g) => g.group_id !== groupId)
        const newGroupView = {
          ...groupView,
          groups: newGroups,
          last_updated: new Date().toISOString(),
        }

        await get().saveGroupView(newGroupView)
      },

      // 그룹 상태 초기화
      resetGroupView: () => {
        set({ groupView: null, initialized: false })
      },
    }),
    {
      name: 'group-view-storage', // persist key
      partialize: (s) => ({ groupView: s.groupView }), // 저장 필드 최소화
    }
  )
)
