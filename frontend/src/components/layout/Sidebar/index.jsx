import * as S from './Sidebar.styles'
import SidebarMenu from './SidebarMenu'
import SidebarToggle from './SidebarToggle'
import SidebarSetting from './SidebarSetting'
import { useSidebarStore } from '@/store/useSidebarStore'
import { useNavigate } from '@tanstack/react-router'

export default function Sidebar() {
  const { isCollapsed } = useSidebarStore()
  const navigate = useNavigate()

  const handleNavigate = (path) => {
    navigate({ to: path })
  }

  return (
    <S.Container $collapsed={isCollapsed}>
      <S.Section>
        <SidebarToggle />
      </S.Section>

      <S.Middle>
        <SidebarMenu onNavigate={handleNavigate} />
      </S.Middle>

      <S.Section>
        <SidebarSetting onNavigate={handleNavigate} />
      </S.Section>
    </S.Container>
  )
}
