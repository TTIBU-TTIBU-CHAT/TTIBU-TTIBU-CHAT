// FlowCanvas.jsx
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
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";

import { GlobalRFStyles, FlowWrap } from "./styles";
import { nodeStyle, edgeStyle } from "./styles";
import {
  edge,
  stripRuntimeEdge,
  serializeEdges,
  serializeNodes,
} from "./utils";
import { initialNodes, initialEdges } from "./initialData";
import DeletableEdge from "./edges/DeletableEdge";
import SelectionOverlay from "./overlays/SelectionOverlay";
import QaNode from "../GroupFlow/QaNode";

/* MIME 키 (검색/그룹 둘 다 지원) */
const DND_MIME_RESULT = "application/x-ttibu-resultcard";
const DND_MIME_GROUP  = "application/x-ttibu-card";

/* ===== 배치/충돌 관련 상수 & 유틸 ===== */
const H_SPACING = 260;
const V_SPACING = 110;
const COLLIDE_EPS = 12;
const MAX_PER_COL = 5;

const getChildren = (eds, parentId) =>
  eds.filter((e) => e.source === parentId).map((e) => e.target);

const zigzag = (n) => (n === 0 ? 0 : n % 2 === 1 ? Math.ceil(n / 2) : -n / 2);

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

const computeIncomingMap = (edges) => {
  const map = new Map();
  edges.forEach((e) => map.set(e.target, (map.get(e.target) || 0) + 1));
  return map;
};

const withHandlesByRoot = (nodes, edges) => {
  const incoming = computeIncomingMap(edges);
  return nodes.map((n) => {
    const isRoot = !incoming.get(n.id);
    if (isRoot) {
      const { targetPosition, ...rest } = n;
      return { ...rest, sourcePosition: Position.Right };
    }
    return { ...n, sourcePosition: Position.Right, targetPosition: Position.Left };
  });
};

const ROOT_X_OFFSET = 120;

/* ============================================================
 * 1) Provider 바깥 쉘
 * ============================================================ */
const FlowCanvas = forwardRef(function FlowCanvas(props, ref) {
  return (
    <>
      <GlobalRFStyles />
      <ReactFlowProvider>
        <FlowCore {...props} ref={ref} />
      </ReactFlowProvider>
    </>
  );
});

/* ============================================================
 * 2) Provider 내부 실제 로직
 * ============================================================ */
const FlowCore = forwardRef(function FlowCore(
  {
    editMode = true,
    onCanResetChange,
    onSelectionCountChange,
    onNodeClickInViewMode,
    onCreateNode,
  },
  ref
) {
  const nodeTypes = useMemo(() => ({ qa: QaNode }), []);
  const rf = useReactFlow(); // ✅ Provider 내부

  /* ===== 상태 ===== */
  const [nodes, setNodes, onNodesChange] = useNodesState(
    withHandlesByRoot(
      initialNodes.map((n) => ({ ...n, type: "qa", style: nodeStyle })),
      initialEdges
    )
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    initialEdges.map(stripRuntimeEdge)
  );

  const [selectedNodes, setSelectedNodes] = useState([]);
  const [lastSelectedId, setLastSelectedId] = useState(null);

  const initialSnapshotRef = useRef({
    nodes: serializeNodes(
      initialNodes.map((n) => ({ ...n, type: "qa", style: nodeStyle }))
    ),
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

  /* ===== 노드 액션: 자식 추가 ===== */
  const addSiblingNode = useCallback(() => {
    if (!lastSelectedId) return;
    const base = nodes.find((n) => n.id === lastSelectedId);
    if (!base) return;

    const childIds = getChildren(edges, base.id);
    const idx = childIds.length;
    const col = Math.floor(idx / MAX_PER_COL);
    const row = idx % MAX_PER_COL;

    const draftX = (base.position?.x ?? 0) + H_SPACING * (col + 1);
    const draftY = (base.position?.y ?? 0) + zigzag(row) * V_SPACING;

    const { x, y } = findFreeSpot(nodes, draftX, draftY);

    const newId = `n-${Date.now()}`;
    const newNode = {
      id: newId,
      type: "qa",
      position: { x, y },
      data: {
        label: "새 노드",
        summary: "요약을 입력하세요",
        question: "",
        answer: "",
      },
      style: nodeStyle,
      sourcePosition: Position.Right,
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
            ({ s, t }) => !other.some((oe) => oe.source === s && oe.target === t)
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

  /* ===== 그룹 생성 (콘솔 로그) ===== */
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
      bounds: { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY },
      timestamp: new Date().toISOString(),
    };

    console.log("GROUP_SELECTED", group, list);
  }, [nodes, selectedNodes]);

  /* ===== 루트 핸들 재적용 & 초기 오프셋 ===== */
  const didInitialRootOffset = useRef(false);

  useEffect(() => {
    setNodes((prev) => withHandlesByRoot(prev, edges));
  }, [edges, setNodes]);

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
        initialNodes.map((n) => ({ ...n, type: "qa", style: nodeStyle })),
        initialEdges
      )
    );
    setEdges(initialEdges.map(stripRuntimeEdge));
    setLastSelectedId(null);
    setSelectedNodes([]);
    onSelectionCountChange?.(0);
  }, [setNodes, setEdges, onSelectionCountChange]);

  /* ===== 외부 메서드 노출 ===== */
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

  /* ===== canReset 보고 ===== */
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
    }),
    [editMode]
  );

  /* ===== DnD: 검색 ResultCard & 그룹 GroupCard → Flow ===== */
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const tryGetPayload = (dt) => {
    const rawResult = dt.getData(DND_MIME_RESULT);
    const rawGroup  = dt.getData(DND_MIME_GROUP);
    const raw = rawResult || rawGroup;
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      const payload = tryGetPayload(e.dataTransfer);
      if (!payload) return;

      const pos = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const { x, y } = findFreeSpot(nodes, pos.x, pos.y);

      // 그룹 카드인지 검사
      if (payload.kind === "group" && payload.title) {
        const id = `g-${payload.id}-${Date.now()}`;
        const graph = payload.graph ?? { nodes: [], edges: [] };
        const newNode = {
          id,
          type: "qa",
          position: { x, y },
          data: {
            label: payload.title,            // 그룹명
            summary: `그룹: 노드 ${graph.nodes?.length ?? 0} · 엣지 ${graph.edges?.length ?? 0}`,
            question: "",                    // 그룹은 Q/A 본문 없음
            answer: "",
            group: graph,                    // 🔗 원본 그래프를 통째로 보관
            kind: "group",
          },
          style: nodeStyle,
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        };
        setNodes((nds) => [...nds, newNode]);
        onCreateNode?.(id, payload);
        return;
      }

      // 그렇지 않으면 검색 결과 카드로 처리
      const id = `q-${payload.id ?? "ad-hoc"}-${Date.now()}`;
      const newNode = {
        id,
        type: "qa",
        position: { x, y },
        data: {
          label: payload.label || payload.question || "질문",
          summary: (payload.answer || "").slice(0, 140),
          question: payload.question || payload.label || "",
          answer: payload.answer || "",
          tags: payload.tags || [],
          date: payload.date,
          kind: "result",
        },
        style: nodeStyle,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
      setNodes((nds) => [...nds, newNode]);
      onCreateNode?.(id, payload);
    },
    [nodes, rf, setNodes, onCreateNode]
  );

  return (
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
        nodeTypes={nodeTypes}
        onPaneContextMenu={(e) => e.preventDefault()}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
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
  );
});

export default FlowCanvas;
