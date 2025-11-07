import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { authService } from '@/services/authService'

export const useAuthStore = create(
  subscribeWithSelector((set) => ({
    user: null,
    isAuthed: false,
    token: '',

    initialize: async () => {
      const { isAuthed } = useAuthStore.getState()
      if (isAuthed) {
        console.log('[INIT] 이미 로그인 상태, CSRF 요청 스킵')
        return
      }

      try {
        const { data } = await authService.initCsrf()
        if (data?.token) {
          set({ token: data.token })
          console.log('[INIT] CSRF 토큰 발급 완료', data.token)
        }
      } catch (err) {
        console.warn('[INIT] CSRF 발급 실패', err)
      }
    },

    signUp: async (payload) => {
      await authService.signup(payload)
    },

    signIn: async (payload) => {
      await authService.login(payload)
      set({ isAuthed: true })

      // 로그인 후에만 CSRF 토큰 새로 발급
      const { data } = await authService.initCsrf().catch(() => ({}))
      console.log('로그인후에 csrf 토큰 발급')
      if (data?.token) set({ token: data.token })
      console.log('새로 발급한 token', data?.token)
    },

    signOut: async () => {
      await authService.logout().catch(() => {})
      set({ isAuthed: false })
    },
  }))
)
