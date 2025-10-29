import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 캐시 전략(예시): 30초 동안 신선, 포커스 전환시 재요청 X
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})