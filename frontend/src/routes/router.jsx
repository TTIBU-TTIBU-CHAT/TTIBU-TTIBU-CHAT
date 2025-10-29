import { createRouter } from '@tanstack/react-router'
import { rootRoute } from '@routes/__root'
import { indexRoute } from '@routes/index'
import { signinRoute } from '@routes/signin'
import { dashboardRoute } from '@routes/dashboard'

const routeTree = rootRoute.addChildren([indexRoute, signinRoute, dashboardRoute])

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultStaleTime: 30_000,
})
