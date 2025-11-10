import { api } from '@services/api'

export const aiKeyService = {
  getProviders: () => api.get('/models/providers'),
  createKey: (payload) => api.post('/keys', payload),
  updateKey: (payload) => api.put('/keys', payload),
  getKey: (keyUid) => api.get(`/keys/${keyUid}`),
  deleteKey: (keyUid) => api.delete(`/keys/${keyUid}`),
}
