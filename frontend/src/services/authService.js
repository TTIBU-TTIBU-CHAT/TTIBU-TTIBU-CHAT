import { api } from '@services/api'

export const authService = {
  initCsrf: () => api.get('/members/csrf'),
  signup: (payload) => api.post('/members', payload),
  login: (payload) => api.post('/members/login', payload),
  logout: () => api.post('/members/logout'),
  getSession: () => api.get('/members/session'),
  getMe: () => api.get('members/me'),
}
