import axios from 'axios'
import { useAuthStore } from '@store/useAuthStore'
import { authService } from '@/services/authService'

// 공통 axios 인스턴스
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  timeout: 10_000,
  withCredentials: true,
  xsrfCookieName: 'none',
  xsrfHeaderName: 'none',
})

// 요청 인터셉터: CSRF 토큰 자동 주입
api.interceptors.request.use((config) => {
  const { token } = useAuthStore.getState()
  if (token) config.headers['X-CSRF-TOKEN'] = token

  console.debug('[REQUEST]', config.method?.toUpperCase(), config.url, {
    hasToken: !!token,
  })
  
  return config
})

let isRefreshing = false
let retryQueue = []

// 응답 인터셉터: (401/403 자동 처리 + 로그 + 재시도)
api.interceptors.response.use(
  (res) => {
    // 정상 응답: 세션/토큰 상태 로그 출력
    if (res?.status) {
      console.debug('[RESPONSE]', res.status, res.config.url)
    }
    return res
  },

  async (err) => {
    const { response, config } = err
    const authStore = useAuthStore.getState()

    // 응답 없음 (네트워크 에러 등)
    if (!response) {
      console.error('[NETWORK ERROR]', err)
      return Promise.reject(err)
    }

    const originalRequest = config
    const status = response.status
    const reason = response.data.data.reason

    // --------------------------------------------------------------
    // Case 1: 401 Unauthorized — 세션 만료
    // --------------------------------------------------------------
    if (status === 401 && reason === '인증이 필요합니다.') {
      console.warn('[AUTH] 세션 만료 감지 (401) → 자동 로그아웃 처리')
      await authStore.signOut()

      // CSRF 즉시 재발급 시도
      try {
        const { data } = await authService.initCsrf()
        if (data?.token) {
          authStore.token = data.token
          console.info('[CSRF] 401 이후 토큰 재발급 성공')
        }
      } catch (e) {
        console.error('[CSRF] 401 이후 재발급 실패', e)
      }

      return Promise.reject(err)
    }

    // --------------------------------------------------------------
    // Case 2: 403 Forbidden — CSRF 토큰 만료
    // --------------------------------------------------------------
    if (status === 403 && !originalRequest._retry && reason === 'CSRF 토큰이 유효하지 않습니다.') {
      if (isRefreshing) {
        // 이미 다른 요청이 토큰 갱신 중이면 큐에 대기
        return new Promise((resolve, reject) => {
          retryQueue.push({ resolve, reject })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      console.warn('[CSRF] 토큰 만료 감지 (403) → 재발급 및 재시도 시도')

      try {
        const { data } = await authService.initCsrf()
        if (data?.token) {
          authStore.token = data.token
          console.info('[CSRF] 403 재발급 성공 → 실패 요청 재시도')
          // 대기 중이던 요청들 재시도
          retryQueue.forEach(({ resolve }) => resolve(api(originalRequest)))
          retryQueue = []
          isRefreshing = false
          return api(originalRequest) // 본 요청 재시도
        }
      } catch (e) {
        console.error('[CSRF] 403 재발급 실패 → 로그아웃')
        await authStore.signOut()
        retryQueue.forEach(({ reject }) => reject(e))
        retryQueue = []
        isRefreshing = false
        return Promise.reject(e)
      }
    }

    // --------------------------------------------------------------
    // Case 3: 그 외 에러
    // --------------------------------------------------------------
    console.error('[ERROR]', status, response.data)
    return Promise.reject(err)
  }
)