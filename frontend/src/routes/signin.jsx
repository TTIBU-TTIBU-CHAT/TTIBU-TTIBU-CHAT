import React from 'react'
import { createRoute, useNavigate } from '@tanstack/react-router'
import { rootRoute } from '@routes/__root'
import { useAuthStore } from '@store/useAuthStore'

export const SignInPage = () => {
  const navigate = useNavigate()
  const signIn = useAuthStore(s => s.signIn)

  const handleLogin = async () => {
    // TODO: 실제 로그인 API 연동
    await signIn({ token: 'mock-token', user: { id: 1, name: '햄' } })
    navigate({ to: '/dashboard' })
  }

  return (
    <section className="max-w-sm">
      <h1 className="text-xl font-bold mb-4">로그인</h1>
      <button className="border px-3 py-2 rounded" onClick={handleLogin}>Sign In</button>
    </section>
  )
}

export const signinRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/signin',
  component: SignInPage,
})
