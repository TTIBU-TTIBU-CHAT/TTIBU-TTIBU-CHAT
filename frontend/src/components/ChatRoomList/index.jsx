import * as S from './ChatRoomList.styles'
import ListItem from '@/components/common/ListItem'
import { mockChats } from '@/data/mockListData'
import { useNavigate } from '@tanstack/react-router'

export default function ChatRoomList() {
  const navigate = useNavigate()

  const handleClickChat = (id) => {
    navigate({ to: `/chatRooms/${id}` })
  }

  return (
    <S.Container>
      <S.Title>채팅방</S.Title>
      {mockChats.map((chat) => (
        <ListItem
          key={chat.id}
          title={chat.name}
          summary={chat.lastMessage}
          date={chat.date}
          onClick={() => handleClickChat(chat.id)}
        />
      ))}
    </S.Container>
  )
}
