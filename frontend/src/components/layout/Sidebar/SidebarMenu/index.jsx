import * as S from './SidebarMenu.styles'
import { useSidebarStore } from '@/store/useSidebarStore'
import NewChatIcon from '@/components/icons/NewChatIcon'
import GroupIcon from '@/components/icons/GroupIcon'
import ChatRoomIcon from '@/components/icons/ChatRoomIcon'

export default function SidebarMenu() {
  const { isCollapsed } = useSidebarStore()

  const menuItems = [
    { id: 'new', icon: <NewChatIcon />, label: '새 채팅' },
    { id: 'group', icon: <GroupIcon />, label: '그룹' },
    { id: 'chat', icon: <ChatRoomIcon />, label: '채팅방' },
  ]

  return (
    <>
      {menuItems.map(({ icon, label }) => (
        <S.MenuItem key={label} $collapsed={isCollapsed}>
          <div className="icon">{icon}</div>
          <span>{label}</span>
        </S.MenuItem>
      ))}
    </>
  )
}
