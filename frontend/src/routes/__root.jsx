// /src/routes/__root.jsx
import { createRootRoute, Outlet } from "@tanstack/react-router";
import styled from "styled-components";
import Sidebar from "@/components/layout/Sidebar";
import { useSidebarStore } from "@/store/useSidebarStore";
import { useEffect, useMemo, useRef } from "react";


const TRANS_MS = 280

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {

  const { isCollapsed } = useSidebarStore();
  const sidebarW = useMemo(() => (isCollapsed ? 72 : 240), [isCollapsed]);

  const mainRef = useRef(null);
  // ✅ 사이드바 너비를 전역 CSS 변수로 publish (모달이 어디서든 참조 가능)
  useEffect(() => {
    document.documentElement.style.setProperty("--sidebar-w", `${sidebarW}px`);
  }, [sidebarW]);
  // 전환 종료 시점에 resize 이벤트를 날려 ReactFlow가 최종 레이아웃에서 리사이즈하도록
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;

    const onEnd = (e) => {
      if (e.propertyName === "margin-left") {
        // 메인 margin-left 전환이 끝났을 때만
        window.dispatchEvent(new Event("resize"));
      }
    };
    el.addEventListener("transitionend", onEnd);
    return () => el.removeEventListener("transitionend", onEnd);
  }, []);


  if (!initialized) return <div>로딩 중...</div>

  if (initialized) {
    if (!isAuthed && !isAuthPage) {
      return <Navigate to="/login" replace />
    }
    if (isAuthed && isAuthPage) {
      return <Navigate to="/" replace />
    }
  }

  return (
    <Shell>
      {/* 고정 사이드바(너비에 트랜지션) */}
      <AsideWrap $w={sidebarW} style={{ "--sbw": `${sidebarW}px` }}>
        <Sidebar />
      </AsideWrap>

      {/* 메인(왼쪽 마진에 트랜지션) */}
      <Main
        ref={mainRef}
        $left={sidebarW}
        style={{ "--left": `${sidebarW}px` }}

      >
        <Outlet />
      </Main>
    </Shell>
  );
}

const Shell = styled.div`
  position: relative;
  min-height: 100dvh;
  background: #f5f7fb;
  font-family: "Pretendard", "Noto Sans KR", sans-serif;
`;


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
`;

const Main = styled.main`
  position: relative;
  min-height: 100dvh;
  margin-left: var(--left, 260px);
  transition: margin-left ${TRANS_MS}ms ease;
  will-change: margin-left;
`;
