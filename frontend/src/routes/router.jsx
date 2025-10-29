import { createRouter } from '@tanstack/react-router'
import { rootRoute } from './__root'
import { indexRoute } from './index'
import { signinRoute } from './signin'
import { dashboardRoute } from './dashboard'

const routeTree = rootRoute.addChildren([indexRoute, signinRoute, dashboardRoute])

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultStaleTime: 30_000,
})
