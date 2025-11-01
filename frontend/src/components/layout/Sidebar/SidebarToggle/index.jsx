import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBars } from '@fortawesome/free-solid-svg-icons'
import * as S from './SidebarToggle.styles'
import { useSidebarStore } from '@/store/useSidebarStore'

export default function SidebarToggle() {
  const { toggleSidebar } = useSidebarStore()

  return (
    <S.ToggleButton onClick={toggleSidebar}>
      <FontAwesomeIcon icon={faBars} size="lg" />
    </S.ToggleButton>
  )
}
