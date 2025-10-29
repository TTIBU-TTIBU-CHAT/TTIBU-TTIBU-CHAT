import React from 'react'
import { createRoute, redirect } from '@tanstack/react-router'
import { rootRoute } from '@routes/__root'
import { authSnapshot, useAuthStore } from '@store/useAuthStore'
import { queryClient } from '@services/queryClient'
import { userMeQuery } from '@services/userService'

export const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  beforeLoad: async () => {
    if (!authSnapshot().isAuthed) throw redirect({ to: '/signin' })
    await queryClient.ensureQueryData(userMeQuery()) // 프리패치 예시
  },
  component: function DashboardPage() {
    const user = useAuthStore(s => s.user)
    return (
      <section>
        <h1 className="text-xl font-bold">대시보드</h1>
        <p>어서오세요 {user?.name} 님!</p>
      </section>
    )
  },
})
