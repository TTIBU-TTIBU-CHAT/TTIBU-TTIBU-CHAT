import { createRootRoute, Outlet, useRouterState, Navigate } from '@tanstack/react-router'
import styled from 'styled-components'
import Sidebar from '@/components/layout/Sidebar'
import { useSidebarStore } from '@/store/useSidebarStore'
import { useEffect, useMemo, useRef } from 'react'
import { useAuthStore } from '@/store/useAuthStore'

const TRANS_MS = 280

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  const { isCollapsed } = useSidebarStore()
  // ✅ authChecked로 가드 타이밍 제어
  const { isAuthed, initialize, authChecked } = useAuthStore()
  const routerState = useRouterState()

  const sidebarW = useMemo(() => (isCollapsed ? 72 : 240), [isCollapsed])
  const mainRef = useRef(null)
  const pathname = routerState.location.pathname
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup')

  useEffect(() => {
    // ✅ 새로고침 시: persist 하이드레이션된 값(이전 로그인 상태)을 기준으로 가드 판단
    //    실제 세션 만료는 첫 API 401에서 signOut → 다음 렌더에서 가드가 /login 으로 보냄
    initialize()
  }, [initialize])

  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    const onEnd = (e) => {
      if (e.propertyName === 'margin-left') window.dispatchEvent(new Event('resize'))
    }
    el.addEventListener('transitionend', onEnd)
    return () => el.removeEventListener('transitionend', onEnd)
  }, [])

  // ✅ 세션 확인/하이드레이션 완료 전에는 가드를 보류
  if (!authChecked) return <div>로딩 중...</div>

  if (!isAuthed && !isAuthPage) return <Navigate to="/login" replace />
  if (isAuthed && isAuthPage) return <Navigate to="/" replace />

  return (
    <Shell>
      {isAuthed && !isAuthPage && (
        <AsideWrap $w={sidebarW} style={{ '--sbw': `${sidebarW}px` }}>
          <Sidebar />
        </AsideWrap>
      )}
      <Main
        ref={mainRef}
        $left={isAuthed && !isAuthPage ? sidebarW : 0}
        style={{ '--left': isAuthed && !isAuthPage ? `${sidebarW}px` : '0px' }}
      >
        <Outlet />
      </Main>
    </Shell>
  )
}

const Shell = styled.div`
  position: relative;
  min-height: 100dvh;
  background: #f5f7fb;
`
const AsideWrap = styled.aside`
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: var(--sbw, 260px);
  transition: width ${TRANS_MS}ms ease;
  z-index: 5;
  background: transparent;
  will-change: width;
`
const Main = styled.main`
  position: relative;
  min-height: 100dvh;
  margin-left: var(--left, 260px);
  transition: margin-left ${TRANS_MS}ms ease;
  will-change: margin-left;
`
