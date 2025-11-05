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
  Handle,
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

/* ✅ 두 MIME 모두 지원 (검색/그룹) */
const DND_MIME_RESULT = "application/x-ttibu-resultcard";
const DND_MIME_GROUP  = "application/x-ttibu-card";

/* ===== 배치/충돌 유틸 ===== */
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

/* ===== 루트/핸들 ===== */
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
    return {
      ...n,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    };
  });
};

const ROOT_X_OFFSET = 120;

/* 🔹 (더 이상 사용 안 함) 그룹 타이틀 노드 자리채움 */
function GroupTitleNode() {
  return (
    <div style={{
      background: "#F4FAF7",
      border: "2px dashed #BFEAD0",
      borderRadius: 14,
      padding: "10px 12px",
      color: "#1F6F4A",
      minWidth: 240,
      minHeight: 60,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 800,
      fontSize: 13,
    }}>
      Group
      <Handle type="target" position={Position.Left} style={{ opacity: 1 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 1 }} />
    </div>
  );
}

/* ====== Provider 내부 코어 ====== */
const FlowCanvasInner = forwardRef(function FlowCanvasInner(
  {
    editMode = true,
    onCanResetChange,
    onSelectionCountChange,
    onNodeClickInViewMode,
    onCreateNode,
  },
  ref
) {
  const { screenToFlowPosition } = useReactFlow();

  /* qa: QaNode / gtitle: GroupTitleNode(미사용) */
  const nodeTypes = useMemo(() => ({ qa: QaNode, gtitle: GroupTitleNode }), []);

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

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, ...edgeStyle }, eds)),
    [setEdges]
  );

  useEffect(() => {
    if (!editMode) {
      setSelectedNodes([]);
      setLastSelectedId(null);
      onSelectionCountChange?.(0);
    }
  }, [editMode, onSelectionCountChange]);

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
    const newId = `n${Date.now()}`;
    const newNode = {
      id: newId,
      type: "qa",
      position: { x, y },
      data: { label: "새 노드", summary: "요약을 입력하세요", question: "", answer: "" },
      style: nodeStyle,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
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
      return prev.map((n) =>
        !incoming.get(n.id)
          ? {
              ...n,
              position: {
                x: (n.position?.x ?? 0) - ROOT_X_OFFSET,
                y: n.position?.y ?? 0,
              },
            }
          : n
      );
    });
    didInitialRootOffset.current = true;
  }, []); // eslint-disable-line

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

  useEffect(() => {
    const now = { nodes: serializeNodes(nodes), edges: serializeEdges(edges) };
    const base = initialSnapshotRef.current;
    const changed = now.nodes !== base.nodes || now.edges !== base.edges;
    onCanResetChange?.(changed);
  }, [nodes, edges, onCanResetChange]);

  const edgeTypes = useMemo(() => ({ deletable: DeletableEdge }), []);
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

  /* ===== DnD: Search / Group 카드 공용 처리 ===== */
  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  // ✅ 두 MIME 중 어떤 걸로 와도 읽는다
  const getPayloadFromDT = (dt) => {
    const raw = dt.getData(DND_MIME_RESULT) || dt.getData(DND_MIME_GROUP);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      const payload = getPayloadFromDT(e.dataTransfer);
      if (!payload) return;

      const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const { x, y } = findFreeSpot(nodes, flowPos.x, flowPos.y);

      // ✅ 그룹 카드는 qa 타입 + data.kind="group" (줌 2단계 렌더)
      if (payload.kind === "group") {
        const id = `grp_${payload.id}_${Date.now()}`;
        const g = payload.graph ?? { nodes: [], edges: [] };
        const label = payload.title || "Group";
        const summary = payload.summary || ""; // ← 받으면 그대로 씀

        const newNode = {
          id,
          type: "qa",
          position: { x, y },
          data: {
            kind: "group",
            label,
            summary,
            group: g,
          },
          style: nodeStyle,
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        };
        setNodes((nds) => [...nds, newNode]);
        onCreateNode?.(id, payload);
        return;
      }

      // 일반 검색 결과 카드
      const id = `res_${payload.id || "adhoc"}_${Date.now()}`;
      const newNode = {
        id,
        type: "qa",
        position: { x, y },
        data: {
          label: payload.label || payload.question || "질문",
          summary: (payload.answer || "").slice(0, 140),
          question: payload.question || payload.label || "",
          answer: payload.answer || "",
          date: payload.date,
        },
        style: nodeStyle,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
      setNodes((nds) => [...nds, newNode]);
      onCreateNode?.(id, payload);
    },
    [nodes, screenToFlowPosition, setNodes, onCreateNode]
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
        onDragOver={onDragOver}
        onDrop={onDrop}
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

export default function FlowCanvas(props) {
  return (
    <>
      <GlobalRFStyles />
      <ReactFlowProvider>
        <FlowCanvasInner {...props} />
      </ReactFlowProvider>
    </>
  );
}
