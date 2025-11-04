import axios from 'axios'
import { authSnapshot, useAuthStore } from '@store/useAuthStore'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 10_000,
})

api.interceptors.request.use((config) => {
  const token = authSnapshot().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      useAuthStore.getState().signOut()
    }
    return Promise.reject(err)
  }
)