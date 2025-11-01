import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGear } from '@fortawesome/free-solid-svg-icons'
import * as S from './SidebarSetting.styles'

export default function SidebarSetting() {
  return (
    <S.SettingButton>
      <FontAwesomeIcon icon={faGear} size="lg" />
    </S.SettingButton>
  )
}
