import { create } from 'zustand'
import { aiKeyService } from '@services/aiKeyService'
import { authService } from '@services/authService'

export const useAiKeyStore = create((set) => ({
  providers: [],
  key: [],
  selectedKey: null,
  loading: false,
  error: null,

  // 제공사 목록 불러오기
  fetchProviders: async () => {
    set({ loading: true, error: null })
    try {
      const res = await aiKeyService.getProviders()
      if (res.data.status === 'success') {
        set({ providers: res.data.data, loading: false })
      } else {
        set({ error: res.data.message || '조회 실패', loading: false })
      }
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  // 키 목록 조회 (authService.getMe 이용)
  fetchAllKeys: async () => {
    set({ loading: true, error: null })
    try {
      const res = await authService.getMe()
      if (res.data.status === 'success') {
        const keys = res.data.data?.keys ?? []
        set({
          keys,
          loading: false,
          selectedKey: keys.length > 0 ? keys[0] : null,
        })
      } else {
        set({
          error: res.data.message || '키 목록 조회 실패',
          loading: false,
        })
      }
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  // 키 상세 조회
  fetchKey: async (keyUid) => {
    set({ loading: true, error: null })
    try {
      const res = await aiKeyService.getKey(keyUid)
      if (res.data.status === 'success') {
        set({ selectedKey: res.data.data, loading: false })
      } else {
        set({ error: res.data.message || '조회 실패', loading: false })
      }
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },
}))
