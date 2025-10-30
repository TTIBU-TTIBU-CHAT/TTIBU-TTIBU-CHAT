import { createFileRoute } from '@tanstack/react-router'
import AuthLayout from '@/components/auth/AuthLayout'
import SignUpForm from '@/components/auth/SignUpForm'

export const Route = createFileRoute('/signup/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <AuthLayout>
      <SignUpForm />
    </AuthLayout>
  )
}
