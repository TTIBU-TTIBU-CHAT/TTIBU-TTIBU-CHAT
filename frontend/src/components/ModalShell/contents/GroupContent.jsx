import { useMemo } from "react";
import styled from "styled-components";
import * as S from "../ModalShell.styles";
import ReactFlow, { Background, useNodesState, useEdgesState } from "reactflow";
import "reactflow/dist/style.css";

function MiniGraph({ title, graph, onEdit, onDelete }) {
  const [nodes, , onNodesChange] = useNodesState(graph.nodes);
  const [edges, , onEdgesChange] = useEdgesState(graph.edges);

  return (
    <PreviewCardSurface>
      <PreviewWrap>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          proOptions={{ hideAttribution: true }}
          fitView
          fitViewOptions={{ padding: 0.2 }}
        >
          <Background gap={16} size={1} />
        </ReactFlow>

        <PreviewActions>
          <ActionButton $tone="blue" onClick={onEdit}>
            편집
          </ActionButton>
          <ActionButton $tone="red" onClick={onDelete}>
            삭제
          </ActionButton>
        </PreviewActions>
      </PreviewWrap>
    </PreviewCardSurface>
  );
}

export function GroupContent({ onSelect }) {
  const groups = useMemo(
    () =>
      Array.from({ length: 4 }).map((_, gi) => {
        const x = 80;
        const y = 40;
        const nodes = [
          {
            id: `g${gi}-n1`,
            position: { x, y },
            data: { label: "다익스트라 알고리즘 설명" },
            style: bubbleNodeStyle,
          },
          {
            id: `g${gi}-n3`,
            position: { x: x + 230, y: y + 130 },
            data: { label: "다익스트라 알고리즘 예시" },
            style: bubbleNodeStyle,
          },
        ];
        const edges = [
          {
            id: `g${gi}-e1`,
            source: `g${gi}-n1`,
            target: `g${gi}-n3`,
            style: { stroke: "#8aa6ff" },
            type: "smoothstep",
          },
        ];
        return {
          id: `group-${gi + 1}`,
          title: `Group ${gi + 1}`,
          graph: { nodes, edges },
        };
      }),
    []
  );

  return (
    <>
      <HeaderHint>그룹을 선택하세요</HeaderHint>
      <S.SearchScroll>
        {groups.map((g) => (
          <GroupCard
            key={g.id}
            onClick={() =>
              onSelect?.({ id: g.id, label: g.title, type: "group" })
            }
          >
            <CardTop>
              <CardTitleText>{g.title}</CardTitleText>
            </CardTop>
            <MiniGraph
              title={g.title}
              graph={g.graph}
              onEdit={() => console.log("edit:", g.id)}
              onDelete={() => console.log("delete:", g.id)}
            />
          </GroupCard>
        ))}
      </S.SearchScroll>
    </>
  );
}

/* ===== 스타일 ===== */
const bubbleNodeStyle = {
  background: "#fff",
  border: "1px solid rgba(0,0,0,.10)",
  borderRadius: 12,
  padding: "8px 10px",
  boxShadow: "0 6px 16px rgba(0,0,0,.10)",
  fontSize: 12,
};

const HeaderHint = styled.div`
  padding: 8px 12px 0 12px;
  font-size: 16px;
  color: #253046;
  opacity: 0.9;
  align-self: center;
`;

const GroupCard = styled(S.ResultCard)`
  background:
    linear-gradient(0deg, rgba(139, 114, 227, 0.08), rgba(139, 114, 227, 0.08)),
    #fff;
  border-radius: 18px;
  padding-top: 12px;
`;

const CardTop = styled.div`
  display: flex;
  align-items: center;
  padding: 0 6px 8px 6px;
`;

const CardTitleText = styled.span`
  font-size: 15px;
  font-weight: 800;
  color: #2a344a;
`;

const PreviewCardSurface = styled.div`
  margin-top: 6px;
  border-radius: 16px;
  background: #f3ecff;
  border: 1px solid rgba(99, 102, 241, 0.25);
  padding: 10px;
`;

const PreviewWrap = styled.div`
  position: relative;
  height: 220px;
  border-radius: 12px;
  overflow: hidden;
  & > div {
    height: 100%;
  }
  isolation: isolate;
  & .react-flow {
    position: relative;
    z-index: 1;
  }
`;

const PreviewActions = styled.div`
  position: absolute;
  right: -14%;
  bottom: -82%; /* 카드 안쪽으로 살짝 띄우기 */
  transform: translateX(-50%); /* 🔥 가로 중앙 고정 */
  display: flex;
  gap: 12px;
  z-index: 20; /* ReactFlow 위 */
  pointer-events: none; /* 캔버스 제스처 방해 X */
  & > * {
    pointer-events: auto;
  } /* 버튼은 클릭 가능 */
`;

const ActionButton = styled.button`
  height: 36px;
  padding: 0 14px;
  border-radius: 9999px;
  border: none;
  color: #fff;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  background: ${({ $tone }) => ($tone === "blue" ? "#29466b" : "#cf3b35")};
  box-shadow: 0 14px 26px rgba(0, 0, 0, 0.18);
  transition:
    transform 0.15s ease,
    filter 0.15s ease;

  &:hover {
    filter: brightness(1.06);
    transform: translateY(-1px);
  }
  &:active {
    transform: translateY(0);
  }
  pointer-events: auto;
`;
