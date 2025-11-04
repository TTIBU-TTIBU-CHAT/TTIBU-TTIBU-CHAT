import { api } from '@services/api'

export const userKeys = {
  me: ['user', 'me'],
  profile: (id) => ['user', 'profile', id],
}

export const fetchMe = async () => {
  const { data } = await api.get('/me')
  return data
}

export const userMeQuery = () => ({
  queryKey: userKeys.me,
  queryFn: fetchMe,
})
