import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";

import { GlobalRFStyles, FlowWrap } from "./styles";
import { nodeStyle, edgeStyle } from "./styles";
import {
  edge,
  stripRuntimeEdge,
  stripRuntimeNode,
  serializeEdges,
  serializeNodes,
} from "./utils";
import { initialNodes, initialEdges } from "./initialData";
import DeletableEdge from "./edges/DeletableEdge";
import SelectionOverlay from "./overlays/SelectionOverlay";

/* ===== 배치/충돌 관련 상수 & 유틸 ===== */
const H_SPACING = 260;     // 부모 → 자식 가로 간격
const V_SPACING = 110;     // 형제 간 세로 간격
const COLLIDE_EPS = 12;    // 겹침 판단 오차
const MAX_PER_COL = 5;     // 한 컬럼(세로줄) 당 최대 형제 수

const getChildren = (eds, parentId) =>
  eds.filter((e) => e.source === parentId).map((e) => e.target);

// 0->0, 1->+1, 2->-1, 3->+2, 4->-2 ...
const zigzag = (n) => {
  if (n === 0) return 0;
  return n % 2 === 1 ? Math.ceil(n / 2) : -n / 2;
};

// 현재 노드들과 충돌하지 않는 가장 가까운 위치 찾기(아래로 탐색)
const findFreeSpot = (nodes, startX, startY) => {
  let x = startX;
  let y = startY;
  while (
    nodes.some(
      (n) =>
        Math.abs((n.position?.x ?? 0) - x) < COLLIDE_EPS &&
        Math.abs((n.position?.y ?? 0) - y) < COLLIDE_EPS
    )
  ) {
    y += V_SPACING;
  }
  return { x, y };
};

/* ===== 루트(들어오는 엣지 없음) 판별 & 핸들 적용 ===== */
const computeIncomingMap = (edges) => {
  const map = new Map();
  edges.forEach((e) => {
    map.set(e.target, (map.get(e.target) || 0) + 1);
  });
  return map;
};

const withHandlesByRoot = (nodes, edges) => {
  const incoming = computeIncomingMap(edges);
  return nodes.map((n) => {
    const isRoot = !incoming.get(n.id);
    if (isRoot) {
      const { targetPosition, ...rest } = n;
      return {
        ...rest,
        sourcePosition: Position.Right, // 루트: 왼쪽 핸들 숨김
      };
    }
    return {
      ...n,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,   // 비루트: 좌/우 핸들
    };
  });
};

const ROOT_X_OFFSET = 120; // 루트 초기 오프셋(왼쪽으로 이동)

const FlowCanvas = forwardRef(function FlowCanvas(
  {
    editMode = true,
    onCanResetChange,
    onSelectionCountChange,
    onNodeClickInViewMode,
    onCreateNode,
  },
  ref
) {
  /* ===== 상태 ===== */
  const [nodes, setNodes, onNodesChange] = useNodesState(
    withHandlesByRoot(
      initialNodes.map(stripRuntimeNode).map((n) => ({ ...n, style: nodeStyle })),
      initialEdges
    )
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    initialEdges.map(stripRuntimeEdge)
  );

  const [selectedNodes, setSelectedNodes] = useState([]);
  const [lastSelectedId, setLastSelectedId] = useState(null);

  // 초기 스냅샷 (리셋/변경감지)
  const initialSnapshotRef = useRef({
    nodes: serializeNodes(initialNodes),
    edges: serializeEdges(initialEdges),
  });

  /* ===== 연결 ===== */
  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, ...edgeStyle }, eds)),
    [setEdges]
  );

  /* ===== 편집 모드 전환 시 선택 해제 ===== */
  useEffect(() => {
    if (!editMode) {
      setSelectedNodes([]);
      setLastSelectedId(null);
      onSelectionCountChange?.(0);
    }
  }, [editMode, onSelectionCountChange]);

  /* ===== 선택 변경 ===== */
  const handleSelectionChange = useCallback(
    ({ nodes: selNodes }) => {
      if (!editMode) {
        setSelectedNodes([]);
        setLastSelectedId(null);
        onSelectionCountChange?.(0);
        return;
      }
      const list = selNodes || [];
      setSelectedNodes(list);
      onSelectionCountChange?.(list.length);
      if (list.length === 0) setLastSelectedId(null);
    },
    [editMode, onSelectionCountChange]
  );

  /* ===== 노드 클릭 ===== */
  const onNodeClick = useCallback(
    (e, node) => {
      if (!editMode) {
        e?.preventDefault?.();
        e?.stopPropagation?.();
        onNodeClickInViewMode?.();
        return;
      }
      setLastSelectedId(node?.id || null);
    },
    [editMode, onNodeClickInViewMode]
  );

  /* ===== 노드 액션: 자식 추가(지그재그 + 컬럼 래핑 + 충돌회피) ===== */
  const addSiblingNode = useCallback(() => {
    if (!lastSelectedId) return;
    const base = nodes.find((n) => n.id === lastSelectedId);
    if (!base) return;

    // 현재 부모의 자식 수 = 새 자식의 인덱스
    const childIds = getChildren(edges, base.id);
    const idx = childIds.length;           // 0-based
    const col = Math.floor(idx / MAX_PER_COL);
    const row = idx % MAX_PER_COL;

    const draftX = (base.position?.x ?? 0) + H_SPACING * (col + 1);
    const draftY = (base.position?.y ?? 0) + zigzag(row) * V_SPACING;

    const { x, y } = findFreeSpot(nodes, draftX, draftY);

    const newId = `n${Date.now()}`;
    const newNode = {
      id: newId,
      position: { x, y },
      data: { label: "새 노드" },
      style: nodeStyle,
      sourcePosition: Position.Right, // 엣지 업데이트 후 withHandlesByRoot로 좌/우 확정
    };

    setNodes((nds) => [...nds, newNode]);
    setEdges((eds) => [...eds, edge(base.id, newId)]);
    onCreateNode?.(newId);
  }, [lastSelectedId, nodes, edges, onCreateNode, setNodes, setEdges]);

  const removeSelectedNode = useCallback(() => {
    if (!lastSelectedId) return;

    setEdges((eds) => {
      const incoming = eds.filter((e) => e.target === lastSelectedId);
      const outgoing = eds.filter((e) => e.source === lastSelectedId);
      const other = eds.filter(
        (e) => e.source !== lastSelectedId && e.target !== lastSelectedId
      );

      if (incoming.length === 1) {
        const parentId = incoming[0].source;
        const reattached = outgoing
          .map((e) => ({ s: parentId, t: e.target }))
          .filter(({ s, t }) => s && t && s !== t)
          .filter(
            ({ s, t }) =>
              !other.some((oe) => oe.source === s && oe.target === t)
          )
          .map(({ s, t }) => edge(s, t));

        return [...other, ...reattached];
      }
      return other;
    });

    setNodes((nds) => nds.filter((n) => n.id !== lastSelectedId));
    setLastSelectedId(null);
    setSelectedNodes([]);
    onSelectionCountChange?.(0);
  }, [lastSelectedId, setEdges, setNodes, onSelectionCountChange]);

  /* ===== 그룹 생성 (콘솔 출력 전용) ===== */
  const groupSelected = useCallback(() => {
    const selected = nodes.filter((n) => n.selected);
    const list = selected.length ? selected : selectedNodes;

    if (list.length < 2) {
      console.warn("[Group] 최소 2개 이상 선택해야 그룹화가 가능합니다.");
      return;
    }

    const fallbackW = 160;
    const fallbackH = 40;
    const minX = Math.min(...list.map((n) => n.position.x));
    const minY = Math.min(...list.map((n) => n.position.y));
    const maxX = Math.max(
      ...list.map((n) => n.position.x + (n.width ?? fallbackW))
    );
    const maxY = Math.max(
      ...list.map((n) => n.position.y + (n.height ?? fallbackH))
    );

    const group = {
      id: `group-${Date.now()}`,
      nodeIds: list.map((n) => n.id),
      count: list.length,
      bounds: {
        minX,
        minY,
        maxX,
        maxY,
        width: maxX - minX,
        height: maxY - minY,
      },
      timestamp: new Date().toISOString(),
    };

    console.log("GROUP_SELECTED", group, list);
  }, [nodes, selectedNodes]);

  /* ===== 루트 핸들 재적용 & 초기 루트 오프셋 ===== */
  const didInitialRootOffset = useRef(false);

  // 엣지 변경 시 루트 재판별하여 핸들 갱신
  useEffect(() => {
    setNodes((prev) => withHandlesByRoot(prev, edges));
  }, [edges, setNodes]);

  // 초기 1회: 루트만 살짝 왼쪽으로 이동
  useEffect(() => {
    if (didInitialRootOffset.current) return;
    setNodes((prev) => {
      const incoming = computeIncomingMap(edges);
      const roots = prev.filter((n) => !incoming.get(n.id));
      if (roots.length === 0) return prev;

      return prev.map((n) => {
        const isRoot = !incoming.get(n.id);
        if (!isRoot) return n;
        return {
          ...n,
          position: {
            x: (n.position?.x ?? 0) - ROOT_X_OFFSET,
            y: n.position?.y ?? 0,
          },
        };
      });
    });
    didInitialRootOffset.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ===== 리셋 ===== */
  const reset = useCallback(() => {
    setNodes(
      withHandlesByRoot(
        initialNodes
          .map(stripRuntimeNode)
          .map((n) => ({ ...n, style: nodeStyle })),
        initialEdges
      )
    );
    setEdges(initialEdges.map(stripRuntimeEdge));
    setLastSelectedId(null);
    setSelectedNodes([]);
    onSelectionCountChange?.(0);
  }, [setNodes, setEdges, onSelectionCountChange]);

  /* ===== 외부에서 호출 가능한 메서드 ===== */
  const updateNodeLabel = useCallback(
    (id, label) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, label } } : n
        )
      );
    },
    [setNodes]
  );

  useImperativeHandle(ref, () => ({ reset, groupSelected, updateNodeLabel }), [
    reset,
    groupSelected,
    updateNodeLabel,
  ]);

  /* ===== canReset 계산 & 보고 ===== */
  useEffect(() => {
    const now = { nodes: serializeNodes(nodes), edges: serializeEdges(edges) };
    const base = initialSnapshotRef.current;
    const changed = now.nodes !== base.nodes || now.edges !== base.edges;
    onCanResetChange?.(changed);
  }, [nodes, edges, onCanResetChange]);

  /* ===== 커스텀 엣지 타입 ===== */
  const edgeTypes = useMemo(() => ({ deletable: DeletableEdge }), []);

  /* ===== 상호작용 옵션 ===== */
  const rfInteractivity = useMemo(
    () => ({
      nodesDraggable: editMode,
      nodesConnectable: editMode,
      elementsSelectable: editMode,
      connectOnClick: editMode,
      panOnDrag: true,
      panOnScroll: !editMode,
      zoomOnScroll: editMode,
      // snapToGrid: true,
      // snapGrid: [10, 10],
    }),
    [editMode]
  );

  return (
    <>
      <GlobalRFStyles />
      <ReactFlowProvider>
        <FlowWrap>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onSelectionChange={handleSelectionChange}
            onNodeClick={onNodeClick}
            fitView
            proOptions={{ hideAttribution: true }}
            edgeTypes={edgeTypes}
            onPaneContextMenu={(e) => e.preventDefault()}
            {...rfInteractivity}
          >
            <Background gap={18} size={1} />
            <MiniMap pannable />
            <Controls />
            {editMode && (
              <SelectionOverlay
                selectedNodes={selectedNodes}
                lastSelectedId={lastSelectedId}
                onAdd={addSiblingNode}
                onRemove={removeSelectedNode}
              />
            )}
          </ReactFlow>
        </FlowWrap>
      </ReactFlowProvider>
    </>
  );
});

export default FlowCanvas;
