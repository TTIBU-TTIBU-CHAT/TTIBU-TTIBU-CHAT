import { createFileRoute } from '@tanstack/react-router'
import Sidebar from '@/components/layout/Sidebar'
import ChatList from '@/components/ChatRoomList'
import styled from 'styled-components'
import { useSidebarStore } from '@/store/useSidebarStore'

export const Route = createFileRoute('/chatRooms/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { isCollapsed } = useSidebarStore()

  return (
    <S.Layout>
      <Sidebar />
      <S.Main $collapsed={isCollapsed}>
        <ChatList />
      </S.Main>
    </S.Layout>
  )
}

const S = {
  Layout: styled.div`
    display: flex;
    width: 100%;
    height: 100vh;
    background: #f9fafb;
  `,
  Main: styled.main`
    flex: 1;
    padding-left: ${({ $collapsed }) => ($collapsed ? '70px' : '240px')};
    transition: padding-left 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    overflow-y: auto;
    background: #fff;
  `,
}
