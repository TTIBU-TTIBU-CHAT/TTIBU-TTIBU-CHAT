// GroupContent.jsx

import { useMemo, useRef } from "react";
import styled from "styled-components";
import * as S from "../ModalShell.styles";
import ReactFlow, { Background, useNodesState, useEdgesState } from "reactflow";
import "reactflow/dist/style.css";

/* ✅ FlowCanvas와 동일 MIME 키 */
const DND_MIME = "application/x-ttibu-card";

/* 미니 그래프 프리뷰 카드 */
function MiniGraph({ graph, onEdit, onDelete }) {
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

export function GroupContent({ onPick }) {
  // ← onSelect → onPick
  const dragGhostRef = useRef(null);

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

        const summary = `다익스트라 핵심 흐름: 우선순위 큐로 최소 비용 정점 확장 · 예시 포함`;

        return {
          id: `group-${gi + 1}`,
          title: `Group ${gi + 1}`,
          graph: { nodes, edges },
          summary,
        };
      }),
    []
  );

  const makeDragPayload = (g) =>
    JSON.stringify({
      type: "group",
      id: g.id,
      title: g.title,
      summary: g.summary,
      graph: g.graph,
    });

  const makeDragImage = (cardEl) => {
    if (!cardEl) return null;
    const clone = cardEl.cloneNode(true);
    clone.style.position = "fixed";
    clone.style.top = "-1000px";
    clone.style.left = "-1000px";
    clone.style.pointerEvents = "none";
    clone.style.filter = "none";
    document.body.appendChild(clone);
    dragGhostRef.current = clone;
    return clone;
  };
  const cleanupDragImage = () => {
    if (dragGhostRef.current) {
      document.body.removeChild(dragGhostRef.current);
      dragGhostRef.current = null;
    }
  };

  /* ✅ 클릭(선택) 시: 임시 노드에 꽂을 ‘group 페이로드’를 onPick으로 전달 */
  const handlePick = (g) => {
    onPick?.({
      type: "group",
      id: g.id,
      title: g.title,
      summary: g.summary,
      graph: g.graph,
    });
  };

  return (
    <>
      <HeaderHint>그룹 카드를 드래그하거나 클릭하여 추가하세요</HeaderHint>

      <S.SearchScroll>
        {groups.map((g) => (
          <GroupCard
            key={g.id}
            draggable
            onDragStart={(e) => {
              const ghost = makeDragImage(e.currentTarget);
              if (ghost) e.dataTransfer.setDragImage(ghost, 24, 24);
              e.dataTransfer.setData(DND_MIME, makeDragPayload(g));
            }}
            onDragEnd={cleanupDragImage}
            onClick={() => handlePick(g)} // ★ 클릭 → onPick(group payload)
            title="캔버스로 드래그하거나 클릭해보세요"
          >
            <CardTop>
              <CardTitleText>{g.title}</CardTitleText>
            </CardTop>

            <MiniGraph
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

/* ===== 스타일 (생략 없는 전체) ===== */
const bubbleNodeStyle = {
  background: "#fff",
  border: "1px solid rgba(0,0,0,.10)",
  borderRadius: 12,
  padding: "8px 10px",
  boxShadow: 0 + " 6px 16px rgba(0,0,0,.10)",
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
  cursor: grab;
  &:active {
    cursor: grabbing;
  }
`;

const CardTop = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 0 6px 8px 6px;
  gap: 8px;
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
  bottom: -82%;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  z-index: 20;
  pointer-events: none;
  & > * {
    pointer-events: auto;
  }
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
`;
