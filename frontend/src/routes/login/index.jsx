import { createFileRoute } from '@tanstack/react-router'
import AuthLayout from '@/components/auth/AuthLayout'
import LoginForm from '@/components/auth/LoginForm'

export const Route = createFileRoute('/login/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  )
}
