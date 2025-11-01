import * as S from './SidebarMenu.styles'
import { useSidebarStore } from '@/store/useSidebarStore'
import NewChatIcon from '@/components/icons/NewChatIcon'
import GroupIcon from '@/components/icons/GroupIcon'
import ChatRoomIcon from '@/components/icons/ChatRoomIcon'
import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

export default function SidebarMenu() {
  const { isCollapsed } = useSidebarStore()
  const nav = useNavigate()

  const [groups, setGroups] = useState([])
  const [chats, setChats] = useState([])

  // api 연동 전 임시 목데이터 입니다!
  useEffect(() => {
    const mockGroups = [
      { id: 1, name: '자율 프로젝트 관련 그룹' },
      { id: 2, name: '저녁 메뉴 추천 그룹' },
      { id: 3, name: '기가막힌 아이디어 모아놓은 그룹' },
    ]

    const mockChats = [
      { id: 1, name: '자율 프로젝트' },
      { id: 2, name: '생각 정리하는 채팅방' },
      { id: 3, name: 'React Flow 실험방' },
      { id: 4, name: '기획 리뷰' },
      { id: 5, name: '배포 체크' },
      { id: 6, name: '이것저것' },
    ]

    setGroups(mockGroups)
    setChats(mockChats)
  }, [])

  const handleMoreGroups = () => nav({ to: '/groups' })
  const handleMoreChats = () => nav({ to: '/chats' })

  return (
    <>
      <S.MenuItem $collapsed={isCollapsed}>
        <div className="icon">
          <NewChatIcon />
        </div>
        <span>새 채팅</span>
      </S.MenuItem>

      <S.MenuItem $collapsed={isCollapsed}>
        <div className="icon">
          <GroupIcon />
        </div>
        <span>그룹</span>
      </S.MenuItem>

      {!isCollapsed && (
        <>
          <S.SubList>
            {groups.slice(0, 5).map((group) => (
              <S.SubItem key={group.id}>
                <S.SubText>{group.name}</S.SubText>
              </S.SubItem>
            ))}
          </S.SubList>
          {groups.length > 5 && (
            <S.MoreButton onClick={handleMoreGroups}>
              더보기 ({groups.length - 5}+)
            </S.MoreButton>
          )}
        </>
      )}

      <S.MenuItem $collapsed={isCollapsed}>
        <div className="icon">
          <ChatRoomIcon />
        </div>
        <span>채팅방</span>
      </S.MenuItem>

      {!isCollapsed && (
        <>
          <S.SubList>
            {chats.slice(0, 5).map((chat) => (
              <S.SubItem key={chat.id}>
                <S.SubText>{chat.name}</S.SubText>
              </S.SubItem>
            ))}
          </S.SubList>
          {chats.length > 5 && (
            <S.MoreButton onClick={handleMoreChats}>
              더보기 ({chats.length - 5}+)
            </S.MoreButton>
          )}
        </>
      )}
    </>
  )
}