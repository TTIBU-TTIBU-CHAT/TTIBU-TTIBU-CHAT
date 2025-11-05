// src/components/Flow/FlowCore.jsx
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
  addEdge,
  useEdgesState,
  useNodesState,
  Position,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";

import { FlowWrap } from "../styles";
import { nodeStyle, edgeStyle } from "../styles";
import {
  H_SPACING,
  V_SPACING,
  MIN_ZOOM,
  COLLIDE_EPS,
  ROOT_X_OFFSET,
  countIncoming,
  countOutgoing,
  getTail,
  findFreeSpot,
  computeIncomingMap,
  withHandlesByRoot,
  centerGraphOnce,
  validateLinear,
} from "./graphUtils";
import { DND_MIME_GROUP, DND_MIME_RESULT, getPayloadFromDT } from "./dnd";
import { initialNodes, initialEdges } from "../initialData";
import DeletableEdge from "../edges/DeletableEdge";
import SelectionOverlay from "../overlays/SelectionOverlay";
import QaNode from "../QaNode";
import { edge as makeEdge, stripRuntimeEdge, serializeEdges, serializeNodes } from "../utils";

/* ✅ 임시 노드 스타일만 여기서 오버라이드 (nodeStyle 기반) */
const tempNodeStyle = {
  ...nodeStyle,
  border: "2px dashed #9AD7B8",
  background: "#F6FBF8",
  opacity: 0.85,
  boxShadow: "inset 0 0 0 2px rgba(154,215,184,.25)",
};

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
  const { screenToFlowPosition } = useReactFlow();
  const didInitRef = useRef(false);

  const nodeTypes = useMemo(() => ({ qa: QaNode }), []);
  const edgeTypes = useMemo(() => ({ deletable: DeletableEdge }), []);

  const [nodes, setNodes, onNodesChange] = useNodesState(
    withHandlesByRoot(
      initialNodes.map((n) => ({ ...n, type: "qa", style: nodeStyle })),
      initialEdges
    )
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    initialEdges.map(stripRuntimeEdge)
  );

  /* 엣지 삭제 핸들러 + 초기 주입 */
  const removeEdgeById = useCallback(
    (edgeId) => setEdges((eds) => eds.filter((e) => e.id !== edgeId)),
    [setEdges]
  );

  useEffect(() => {
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        type: "deletable",
        data: { ...(e.data || {}), onRemove: removeEdgeById },
      }))
    );
  }, [removeEdgeById, setEdges]);

  const [selectedNodes, setSelectedNodes] = useState([]);
  const [lastSelectedId, setLastSelectedId] = useState(null);

  const initialSnapshotRef = useRef({
    nodes: serializeNodes(
      initialNodes.map((n) => ({ ...n, type: "qa", style: nodeStyle }))
    ),
    edges: serializeEdges(initialEdges),
  });

  /* ====== 선형 제약 하의 연결 처리 ====== */
  const tryAddLinearEdge = useCallback(
    (sourceId, targetId, extra = {}) => {
      if (
        countOutgoing(edges, sourceId) > 0 ||
        countIncoming(edges, targetId) > 0
      ) {
        console.warn("[Linear] invalid connect:", { sourceId, targetId });
        return false;
      }
      setEdges((eds) =>
        addEdge(
          {
            ...makeEdge(sourceId, targetId),
            ...edgeStyle,
            type: "deletable",
            data: { onRemove: removeEdgeById },
            ...extra,
          },
          eds
        )
      );
      return true;
    },
    [edges, setEdges, removeEdgeById]
  );

  const onConnect = useCallback(
    (params) => {
      const { source, target } = params || {};
      if (!source || !target) return;
      const ok = !(
        countOutgoing(edges, source) > 0 || countIncoming(edges, target) > 0
      );
      if (!ok) {
        console.warn("[Linear] Reject onConnect", params);
        return;
      }
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            ...edgeStyle,
            type: "deletable",
            data: { onRemove: removeEdgeById },
          },
          eds
        )
      );
    },
    [edges, setEdges, removeEdgeById]
  );

  /* ===== 엣지 업데이트(드래그로 재연결) ===== */
  const onEdgeUpdate = useCallback(
    (oldEdge, newConn) => {
      setEdges((eds) => {
        const remaining = eds.filter((e) => e.id !== oldEdge.id);

        const hasChild = remaining.some((e) => e.source === newConn.source);
        const hasParent = remaining.some((e) => e.target === newConn.target);
        if (hasChild || hasParent) {
          console.warn("[Linear] Reject onEdgeUpdate", { hasChild, hasParent, newConn });
          return [...remaining, oldEdge]; // 되돌리기
        }

        return addEdge(
          {
            id: oldEdge.id,
            ...edgeStyle,
            type: "deletable",
            data: { onRemove: removeEdgeById },
            source: newConn.source,
            target: newConn.target,
          },
          remaining
        );
      });
    },
    [setEdges, removeEdgeById]
  );

  /* ===== 선택/보기 모드 ===== */
  useEffect(() => {
    if (!editMode) {
      setSelectedNodes([]); setLastSelectedId(null);
      onSelectionCountChange?.(0);
    }
  }, [editMode, onSelectionCountChange]);

  const handleSelectionChange = useCallback(
    ({ nodes: selNodes }) => {
      if (!editMode) {
        setSelectedNodes([]); setLastSelectedId(null);
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
        e?.preventDefault?.(); e?.stopPropagation?.();
        onNodeClickInViewMode?.(); // 페이지에서 검색패널 열림
        return;
      }
      setLastSelectedId(node?.id || null);
    },
    [editMode, onNodeClickInViewMode]
  );

  /* ===== (+) 새 "임시" 노드 추가: 내용은 나중에 주입 ===== */
  const addNextNode = useCallback(() => {
    const tail = getTail(nodes, edges);
    const baseX = tail ? tail.position?.x ?? 0 : 0;
    const baseY = tail ? tail.position?.y ?? 0 : 0;

    const draftX = baseX + H_SPACING;
    const draftY = baseY;

    const { x, y } = findFreeSpot(nodes, draftX, draftY);
    const newId = `n${Date.now()}`;
    const newNode = {
      id: newId,
      type: "qa",
      position: { x, y },
      data: {
        __temp: true,
        label: "검색에서 선택하세요",
        summary: "",
        question: "",
        answer: "",
      },
      style: tempNodeStyle,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    };

    setNodes((nds) => [...nds, newNode]);
    if (tail) tryAddLinearEdge(tail.id, newId);

    // source: 'plus' 로 알려서 페이지가 Search 패널 열도록
    onCreateNode?.(newId, null, { source: "plus" });
  }, [nodes, edges, setNodes, onCreateNode, tryAddLinearEdge]);

  /* ===== 노드 삭제 ===== */
  const removeSelectedNode = useCallback(() => {
    if (!lastSelectedId) return;

    setEdges((eds) => {
      const incoming = eds.filter((e) => e.target === lastSelectedId);
      const outgoing = eds.filter((e) => e.source === lastSelectedId);
      const other = eds.filter(
        (e) => e.source !== lastSelectedId && e.target !== lastSelectedId
      );

      if (incoming.length === 1 && outgoing.length === 1) {
        const parentId = incoming[0].source;
        const childId = outgoing[0].target;

        const parentHasChild = other.some((e) => e.source === parentId);
        const childHasParent = other.some((e) => e.target === childId);
        if (!parentHasChild && !childHasParent) {
          return [
            ...other,
            {
              ...makeEdge(parentId, childId),
              ...edgeStyle,
              type: "deletable",
              data: { onRemove: removeEdgeById },
            },
          ];
        }
      }
      return other;
    });

    setNodes((nds) => nds.filter((n) => n.id !== lastSelectedId));
    setLastSelectedId(null);
    setSelectedNodes([]); onSelectionCountChange?.(0);
  }, [lastSelectedId, setEdges, setNodes, onSelectionCountChange, removeEdgeById]);

  /* 루트 핸들/오프셋 */
  const didInitialRootOffset = useRef(false);
  useEffect(() => {
    setNodes((prev) => withHandlesByRoot(prev, edges));
  }, [edges, setNodes]);

  useEffect(() => {
    if (didInitialRootOffset.current) return;
    setNodes((prev) => {
      const incoming = computeIncomingMap(edges);
      return prev.map((n) =>
        !incoming.get(n.id)
          ? { ...n, position: { x: (n.position?.x ?? 0) - ROOT_X_OFFSET, y: n.position?.y ?? 0 } }
          : n
      );
    });
    didInitialRootOffset.current = true;
  }, []); // eslint-disable-line

  /* 리셋/라벨 업데이트 */
  const reset = useCallback(() => {
    setNodes(
      withHandlesByRoot(
        initialNodes.map((n) => ({ ...n, type: "qa", style: nodeStyle })),
        initialEdges
      )
    );
    setEdges(initialEdges.map(stripRuntimeEdge));
    setLastSelectedId(null);
    setSelectedNodes([]); onSelectionCountChange?.(0);
  }, [setNodes, setEdges, onSelectionCountChange]);

  const updateNodeLabel = useCallback(
    (id, label) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, label } } : n))
      );
    },
    [setNodes]
  );

  /* ====== 외부용: 임시 노드 취소/채우기 ====== */
  const discardTempNode = useCallback(
    (nodeId) => {
      if (!nodeId) return;
      setNodes((nds) => {
        const target = nds.find((n) => n.id === nodeId);
        if (!target || !target.data?.__temp) return nds;
        setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
        return nds.filter((n) => n.id !== nodeId);
      });
    },
    [setNodes, setEdges]
  );

  const applyContentToNode = useCallback(
    (nodeId, payload) => {
      if (!nodeId || !payload) return;
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n;

          if (payload.kind === "group") {
            const g = payload.graph ?? { nodes: [], edges: [] };
            return {
              ...n,
              style: nodeStyle,
              data: {
                ...n.data,
                __temp: false,
                kind: "group",
                label: payload.title || n.data?.label || "Group",
                summary: payload.summary || "",
                group: g,
              },
            };
          }
          return {
            ...n,
            style: nodeStyle,
            data: {
              ...n.data,
              __temp: false,
              label: payload.label || payload.question || "질문",
              summary: (payload.answer || "").slice(0, 140),
              question: payload.question || payload.label || "",
              answer: payload.answer || "",
              date: payload.date,
            },
          };
        })
      );
    },
    [setNodes]
  );

  // 저장 검증/조작 메서드 노출
  useImperativeHandle(
    ref,
    () => ({
      reset,
      updateNodeLabel,
      validateForSave: () => validateLinear(nodes, edges),
      applyContentToNode,
      discardTempNode,
    }),
    [reset, updateNodeLabel, nodes, edges, applyContentToNode, discardTempNode]
  );

  /* 변경 감지 */
  useEffect(() => {
    const now = { nodes: serializeNodes(nodes), edges: serializeEdges(edges) };
    const base = initialSnapshotRef.current;
    onCanResetChange?.(now.nodes !== base.nodes || now.edges !== base.edges);
  }, [nodes, edges, onCanResetChange]);

  /* 인터랙션 옵션 */
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

  /* DnD */
  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      const payload = getPayloadFromDT(e.dataTransfer, [DND_MIME_RESULT, DND_MIME_GROUP]);
      if (!payload) return;

      const tail = getTail(nodes, edges);
      const baseX = tail ? tail.position?.x ?? 0 : 0;
      const baseY = tail ? tail.position?.y ?? 0 : 0;
      const draftX = baseX + H_SPACING;
      const draftY = baseY;
      const { x, y } = findFreeSpot(nodes, draftX, draftY);

      if (payload.kind === "group") {
        const id = `grp_${payload.id}_${Date.now()}`;
        const g = payload.graph ?? { nodes: [], edges: [] };
        const label = payload.title || "Group";
        const summary = payload.summary || "";

        const newNode = {
          id,
          type: "qa",
          position: { x, y },
          data: { kind: "group", label, summary, group: g },
          style: nodeStyle,
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        };
        setNodes((nds) => [...nds, newNode]);
        if (tail) tryAddLinearEdge(tail.id, id);
        onCreateNode?.(id, payload, { source: "dnd" });
        return;
      }

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
      if (tail) tryAddLinearEdge(tail.id, id);
      onCreateNode?.(id, payload, { source: "dnd" });
    },
    [nodes, edges, setNodes, onCreateNode, tryAddLinearEdge]
  );

  return (
    <FlowWrap>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeUpdate={onEdgeUpdate}
        edgesUpdatable
        onSelectionChange={handleSelectionChange}
        onNodeClick={onNodeClick}
        minZoom={MIN_ZOOM}
        onInit={(instance) => {
          if (didInitRef.current) return;
          centerGraphOnce(instance, MIN_ZOOM);
          didInitRef.current = true;
        }}
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
            onAdd={addNextNode}
            onRemove={removeSelectedNode}
          />
        )}
      </ReactFlow>
    </FlowWrap>
  );
});

export default FlowCore;
