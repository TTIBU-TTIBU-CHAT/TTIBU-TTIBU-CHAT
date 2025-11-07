import axios from 'axios'
import { useAuthStore } from '@store/useAuthStore'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  timeout: 10_000,
  withCredentials: true,
  xsrfCookieName: 'none',
  xsrfHeaderName: 'none',
})

// 요청 인터셉터: 헤더로 XSRF-TOKEN 쿠키 첨부
api.interceptors.request.use((config) => {
  // const xsrfToken = document.cookie
  //   .split('; ')
  //   .find((row) => row.startsWith('XSRF-TOKEN='))
  //   ?.split('=')[1]

  const { token } = useAuthStore.getState()
  console.log(token)
  if (token) config.headers['X-XSRF-TOKEN'] = token
  return config
})

// 응답 인터셉터: 세션 만료 시 자동 로그아웃
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      useAuthStore.getState().signOut()
    }
    return Promise.reject(err)
  }
)