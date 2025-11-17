// src/components/ModalShell/contents/GroupContent.jsx

import { useMemo, useRef } from "react";
import styled from "styled-components";
import * as S from "../ModalShell.styles";
import ReactFlow, { Background, useNodesState, useEdgesState } from "reactflow";
import "reactflow/dist/style.css";
import { useGroups } from "@/hooks/useGroups";
import { useGroupStore } from "@/store/useGroupStore";
/* ✅ FlowCanvas와 동일 MIME 키 */
const DND_MIME = "application/x-ttibu-card";

/* ===== 플레이스홀더 미니 그래프 생성 ===== */
function makePlaceholderGraph(title = "Group") {
  const x = 80;
  const y = 40;
  const nodes = [
    {
      id: `n1`,
      position: { x, y },
      data: { label: `${title} 개요` },
      style: bubbleNodeStyle,
    },
    {
      id: `n2`,
      position: { x: x + 230, y: y + 130 },
      data: { label: `${title} 예시` },
      style: bubbleNodeStyle,
    },
  ];
  const edges = [
    {
      id: `e1`,
      source: `n1`,
      target: `n2`,
      style: { stroke: "#8aa6ff" },
      type: "smoothstep",
    },
  ];
  return { nodes, edges };
}

/* ===== 서버 응답 → UI용 그룹 객체 정규화 ===== */
function normalizeGroup(g, colorMap) {
  // ✅ 백엔드 필드 기준: group_id, name, summary, keyword, updated_at
  const rawGroupId = g?.group_id ?? g?.groupId ?? g?.id ?? null;

  const id = rawGroupId != null ? String(rawGroupId) : String(Math.random());
  const title = g?.name ?? `Group ${id}`;

  const summary = g?.summary ?? "";
  const keywords = Array.isArray(g?.keyword) ? g.keyword : [];
  const updatedAt = g?.updated_at ?? null;
  const color =
    rawGroupId != null
      ? (colorMap?.[rawGroupId] ?? colorMap?.[String(rawGroupId)] ?? null)
      : null;
  // 그래프는 아직 서버에서 안 주므로 placeholder
  const graph = makePlaceholderGraph(title);

  return { id, title, summary, keywords, updatedAt, graph, color, __raw: g };
}

/* ===== 미니 그래프 프리뷰 카드 ===== */
function MiniGraph({ graph }) {
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
      </PreviewWrap>
    </PreviewCardSurface>
  );
}

export function GroupContent({ onPick }) {
  const dragGhostRef = useRef(null);

  // ✅ 실제 그룹 목록 불러오기
  const { data: groupsData, isLoading, isError, error } = useGroups();
  console.log("Fetched groups data:", groupsData);
  // useGroups() → response.data.data = 배열
  const rawGroups = Array.isArray(groupsData) ? groupsData : [];

  // ✅ groupView 에서 color 맵 만들기: { [groupId]: color }
  const groupView = useGroupStore((s) => s.groupView);
  // console.log("[GroupContent] groupView from store:", groupView);
  const colorMap = useMemo(() => {
    const map = {};
    const gs = groupView?.groups ?? [];
    gs.forEach((g) => {
      // store 구조: { group_id, color, ... }
      if (g?.group_id != null && g?.color) {
        map[g.group_id] = g.color;
      }
    });
    console.log("[GroupContent] built colorMap:", map);
    return map;
  }, [groupView]);

  const groups = useMemo(
    () => rawGroups.map((g) => normalizeGroup(g, colorMap)),
    [rawGroups, colorMap]
  );
  console.log(
    "[GroupContent] normalized groups (with color):",
    groups.map((g) => ({
      id: g.id,
      rawGroupId: g.__raw?.group_id ?? g.__raw?.groupId ?? g.__raw?.id,
      color: g.color,
    }))
  );
  const makeDragPayload = (g) =>
    JSON.stringify({
      type: "group",
      id: g.id,
      title: g.title,
      summary: g.summary,
      keywords: g.keywords,
      updatedAt: g.updatedAt,
      graph: g.graph,
      color: g.color,
    });

  const makeDragImage = (cardEl) => {
    if (!cardEl) return null;
    const clone = cardEl.cloneNode(true);
    Object.assign(clone.style, {
      position: "fixed",
      top: "-1000px",
      left: "-1000px",
      pointerEvents: "none",
      filter: "none",
      zIndex: 2147483647,
    });
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

  const handlePick = (g) => {
    onPick?.({
      type: "group",
      id: g.id,
      title: g.title,
      summary: g.summary,
      keywords: g.keywords,
      updatedAt: g.updatedAt,
      graph: g.graph,
      color: g.color, // 🔥 클릭 선택에도 색 같이 전달
    });
  };

  return (
    <>
      <HeaderHint>그룹 카드를 드래그하거나 클릭하여 추가하세요</HeaderHint>

      <S.SearchScroll>
        {/* 상태 표시 */}
        {isLoading && (
          <div style={{ padding: 12, color: "#6b7280", fontSize: 13 }}>
            그룹 불러오는 중…
          </div>
        )}
        {isError && (
          <div style={{ padding: 12, color: "#ef4444", fontSize: 13 }}>
            그룹을 불러오지 못했어요. {error?.message || ""}
          </div>
        )}
        {!isLoading && !isError && groups.length === 0 && (
          <div style={{ padding: 12, color: "#6b7280", fontSize: 13 }}>
            그룹이 없어요. 먼저 그룹을 만들어보세요.
          </div>
        )}

        {/* 그룹 카드 렌더링 */}
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
            onClick={() => handlePick(g)}
          >
            <CardTop>
              <CardTitleText>{g.title}</CardTitleText>
              {g.updatedAt && (
                <CardDate>
                  {new Date(g.updatedAt).toLocaleDateString("ko-KR")}
                </CardDate>
              )}
            </CardTop>

            {/* <MiniGraph graph={g.graph} /> */}

            <CardSummary>{g.summary}</CardSummary>

            {Array.isArray(g.keywords) && g.keywords.length > 0 && (
              <S.TagRow>
                {g.keywords.map((t, idx) => (
                  <S.TagPill key={`${String(t)}-${idx}`}>{String(t)}</S.TagPill>
                ))}
              </S.TagRow>
            )}
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

const CardDate = styled.span`
  font-size: 12px;
  color: #6b7280;
`;

const CardSummary = styled.div`
  padding: 10px;
  font-size: 13px;
  color: #374151;
  line-height: 1.4;
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
  height: 200px;
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
