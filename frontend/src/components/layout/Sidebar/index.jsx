import * as S from './Sidebar.styles'
import SidebarMenu from './SidebarMenu'
import SidebarToggle from './SidebarToggle'
import SidebarSetting from './SidebarSetting'
import { useSidebarStore } from '@/store/useSidebarStore'

export default function Sidebar() {
  const { isCollapsed } = useSidebarStore()

  return (
    <S.Container $collapsed={isCollapsed}>
      <S.Section>
        <SidebarToggle />
      </S.Section>

      <S.Middle>
        <SidebarMenu />
      </S.Middle>

      <S.Section>
        <SidebarSetting />
      </S.Section>
    </S.Container>
  )
}
