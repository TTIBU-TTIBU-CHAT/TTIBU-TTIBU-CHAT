import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGear } from '@fortawesome/free-solid-svg-icons'
import * as S from './SidebarSetting.styles'
import { useNavigate, useRouterState } from '@tanstack/react-router'

export default function SidebarSetting() {
  const navigate = useNavigate()
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  const handleNavigate = () => {
    navigate({ to: '/settings' })
  }

  const isActive = currentPath.startsWith('/settings')

  return (
    <S.SettingButton onClick={handleNavigate} $active={isActive}>
      <FontAwesomeIcon icon={faGear} size="lg" />
    </S.SettingButton>
  )
}
