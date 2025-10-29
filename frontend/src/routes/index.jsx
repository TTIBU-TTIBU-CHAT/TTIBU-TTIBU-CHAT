import React from 'react'
import { createRoute } from '@tanstack/react-router'
import { rootRoute } from './__root'

export const HomePage = () => (
  <section>
    <h1 className="text-xl font-bold">홈</h1>
    <p>TanStack Router + React Query 스타트!</p>
  </section>
)

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
})
