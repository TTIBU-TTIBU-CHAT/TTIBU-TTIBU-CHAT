import { createFileRoute } from "@tanstack/react-router";
import NewChat from "@/components/NewChat";
import styled from "styled-components";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <Layout>
      <Main>
        <NewChat />
      </Main>
    </Layout>
  );
}

/* ===== styled ===== */
const Layout = styled.div`
  display: flex;
  width: 100%;
  height: 100vh;
  background: #f9fafb;
  overflow: hidden;
`;

const Main = styled.main`
  position: relative;
  flex: 1;
  min-width: 0;
  height: 100vh;
  overflow-y: auto;
  background: #fff;

  /* ✅ margin-left 제거 → __root에서 이미 처리됨 */
  box-sizing: border-box;
  z-index: 1;

  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }
`;
