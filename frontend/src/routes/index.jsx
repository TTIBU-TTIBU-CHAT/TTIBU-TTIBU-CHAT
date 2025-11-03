import { createFileRoute } from '@tanstack/react-router'
import Sidebar from '@/components/layout/Sidebar'
import NewChat from '@/components/NewChat'
import styled from 'styled-components'
import { useSidebarStore } from '@/store/useSidebarStore'

export const Route = createFileRoute('/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { isCollapsed } = useSidebarStore()

  return (
    <S.Layout>
      <Sidebar />
      <S.Main $collapsed={isCollapsed}>
        <NewChat />
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
    overflow: hidden;
  `,

  Main: styled.main`
    position: relative;
    flex: 1;
    min-width: 0;
    height: 100vh;
    overflow-y: auto;
    background: #fff;

    margin-left: ${({ $collapsed }) => ($collapsed ? "70px" : "240px")};

    transition: margin-left 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    box-sizing: border-box;
    z-index: 1;

    &::-webkit-scrollbar {
      width: 8px;
    }
    &::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 4px;
    }
  `,
}
