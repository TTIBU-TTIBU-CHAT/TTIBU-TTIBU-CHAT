import { createFileRoute } from '@tanstack/react-router'
import Settings from '@/components/Settings'
import Sidebar from '@/components/layout/Sidebar'

export const Route = createFileRoute('/settings/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <>
      <Settings></Settings>
    </>
  )
}
