import React from 'react'
import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

export const RootLayout = () => (
  <div className="min-h-screen flex flex-col">
    <header className="border-b p-3 flex items-center gap-4">
      <Link to="/" className="[&.active]:font-bold">Home</Link>
      <Link to="/dashboard" className="[&.active]:font-bold">Dashboard</Link>
      <Link to="/signin" className="[&.active]:font-bold] ml-auto">Sign In</Link>
    </header>
    <main className="flex-1 p-4"><Outlet /></main>
    <TanStackRouterDevtools position="bottom-right" />
  </div>
)

export const rootRoute = createRootRoute({ component: RootLayout })
