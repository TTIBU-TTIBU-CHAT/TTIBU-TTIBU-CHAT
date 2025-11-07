import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { persist } from 'zustand/middleware' 
import { authService } from '@/services/authService'

export const useAuthStore = create(
  persist( // ✅ 로컬 하이드레이션으로 새로고침 후에도 isAuthed/token 유지
    subscribeWithSelector((set, get) => ({
      user: null,
      isAuthed: false,
      token: '',
      authChecked: false, // ✅ 하이드레이션/초기화 완료 여부


      // - persist 하이드레이션이 끝나면 현재 저장된 isAuthed/token 상태로 가드 판단
      // - 실제 세션 만료는 첫 API 요청 401에서 signOut 처리(응답 인터셉터)
      initialize: async () => {
        // 여기서는 서버 호출 없이, 하이드레이션된 상태를 신뢰
        // 필요 시 최소한의 부하로 CSRF만 발급(선택)
        try {
          const { data } = await authService.initCsrf().catch(() => ({}))
          if (data?.token) set({ token: data.token })
        } finally {
          set({ authChecked: true }) // ✅ 가드가 동작할 수 있게 표시
        }
      },

      signUp: async (payload) => {
        await authService.signup(payload)
      },

      signIn: async (payload) => {
        await authService.login(payload) // 서버가 세션/쿠키 설정
        // ✅ /me가 없으므로, 일단 클라 상태를 로그인으로 전환
        set({ isAuthed: true })
        // 선택: 로그인 직후 CSRF 재발급
        const { data } = await authService.initCsrf().catch(() => ({}))
        if (data?.token) set({ token: data.token })
      },

      signOut: async () => {
        await authService.logout().catch(() => {})
        set({ isAuthed: false, user: null, token: '' }) // ✅ 전부 초기화
      },
    })),
    {
      name: 'auth-storage', // ✅ persist key
      partialize: (s) => ({ isAuthed: s.isAuthed, user: s.user, token: s.token }), // ✅ 저장 필드 제한
      // onRehydrateStorage를 쓰면 하이드레이션 시점을 알 수 있지만,
      // 여기선 initialize()에서 authChecked를 true로 전환하는 전략으로 충분.
    }
  )
)
