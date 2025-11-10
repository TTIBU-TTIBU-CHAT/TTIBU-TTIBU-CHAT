import * as S from './ChatRoomList.styles'
import ListItem from '@/components/common/ListItem'
import { mockChats } from '@/data/mockListData'
import { useNavigate } from '@tanstack/react-router'
import { useRooms } from '@/hooks/useChatRooms'
export default function ChatRoomList() {
  const navigate = useNavigate()
  const { data: rooms, isLoading } = useRooms();
  const handleClickChat = (id) => {
    navigate({ to: `/chatRooms/${id}` })
  }

  return (
    <S.Container>
      <S.Title>채팅방</S.Title>
      {rooms.map((chat) => (
        <ListItem
          key={chat.room_id}
          title={chat.name}
          summary={chat.latest_question}
          date={chat.updated_at}
          onClick={() => handleClickChat(chat.id)}
        />
      ))}
    </S.Container>
  )
}
