import { createFileRoute } from '@tanstack/react-router'
import Sidebar from '@/components/layout/Sidebar'

export const Route = createFileRoute('/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <>
      <Sidebar />
    </>
  )
}
