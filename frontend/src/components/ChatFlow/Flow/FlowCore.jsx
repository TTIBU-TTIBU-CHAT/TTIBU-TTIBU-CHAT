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

import { FlowWrap, nodeStyle, edgeStyle } from "../styles";
import {
  H_SPACING,
  V_SPACING,
  MIN_ZOOM,
  ROOT_X_OFFSET,
  MAX_PER_COL,
  findFreeSpot,
  computeIncomingMap,
  withHandlesByRoot,
  centerGraphOnce,
  getChildren,
  zigzag,
} from "./graphUtils";
import { getPayloadFromDT, DND_MIME_GROUP, DND_MIME_RESULT } from "./dnd";

import { initialNodes, initialEdges } from "../initialData";
import DeletableEdge from "../edges/DeletableEdge";
import SelectionOverlay from "../overlays/SelectionOverlay";
import QaNode from "../../GroupFlow/QaNode";

import {
  edge as makeEdge,
  stripRuntimeEdge,
  serializeEdges,
  serializeNodes,
} from "../utils";

/* ✅ 임시 노드 스타일 */
const tempNodeStyle = {
  ...nodeStyle,
  border: "2px dashed #9AD7B8",
  background: "#F6FBF8",
  opacity: 0.9,
  boxShadow: "inset 0 0 0 2px rgba(154,215,184,.25)",
};

const FlowCore = forwardRef(function FlowCore(
  {
    editMode = true,
    activeBranch = "전체",
    onCanResetChange,
    onSelectionCountChange,
    onNodeClickInViewMode,
    onEditNodeClick,
    onCreateNode,
    askBranchName,
    onBranchSaved,
    onError,
    roomId,
    roomData,
    roomLoading,
    roomError,
  },
  ref
) {
  // ----- ★ 여기서 콘솔 로깅만 -----
  useEffect(() => {
    if (roomId) console.log("[FlowCore] roomId:", roomId);
  }, [roomId]);

  useEffect(() => {
    if (roomLoading) console.log("[FlowCore] useRoom 로딩중…");
  }, [roomLoading]);

  useEffect(() => {
    if (roomError) console.error("[FlowCore] useRoom 에러:", roomError);
  }, [roomError]);

  useEffect(() => {
    if (roomData) {
      // 필요하면 원하는 필드만 보자: roomData.room, roomData.chats 등
      console.log("[FlowCore] useRoom 데이터 수신:", roomData);
    }
  }, [roomData]);
  const nodeTypes = useMemo(() => ({ qa: QaNode }), []);
  const edgeTypes = useMemo(() => ({ deletable: DeletableEdge }), []);
  const rf = useReactFlow();
  const didInitRef = useRef(false);

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

  const emitError = useCallback(
    (msg) => onError?.({ message: msg }),
    [onError]
  );

  /* ----- 엣지 삭제 핸들러 & 초기 주입 ----- */
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

  /* 새로 연결되는 엣지도 deletable로 */
  const onConnect = useCallback(
    (params) =>
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
      ),
    [setEdges, removeEdgeById]
  );

  /* 보기 모드 전환 시 선택 상태 초기화 */
  useEffect(() => {
    if (!editMode) {
      setSelectedNodes([]);
      setLastSelectedId(null);
      onSelectionCountChange?.(0, false);
    }
  }, [editMode, onSelectionCountChange]);

  /* 선택 변경: 개수 + (그룹 포함 여부) */
  const handleSelectionChange = useCallback(
    ({ nodes: selNodes }) => {
      if (!editMode) {
        setSelectedNodes([]);
        setLastSelectedId(null);
        onSelectionCountChange?.(0, false);
        return;
      }
      const list = selNodes || [];
      setSelectedNodes(list);
      const containsGroup = list.some(
        (n) => n?.data?.type === "group" || !!n?.data?.group
      );
      onSelectionCountChange?.(list.length, containsGroup);
      if (list.length === 0) setLastSelectedId(null);
    },
    [editMode, onSelectionCountChange]
  );

  // 빈 노드 판별: 임시 노드거나(kind/QA 없음)
  const isEmptyNode = (n) =>
    !!n?.data?.__temp ||
    (!n?.data?.type && !n?.data?.question && !n?.data?.answer);

  const onNodeClick = useCallback(
    (e, node) => {
      if (!editMode) {
        e?.preventDefault?.();
        e?.stopPropagation?.();
        // 뷰 모드에서도 빈 노드 여부 넘겨주면 활용 가능
        onNodeClickInViewMode?.(node?.id, { empty: isEmptyNode(node) });
        return;
      }
      setLastSelectedId(node?.id || null);
      // 편집 모드에서 노드 클릭 → 부모에 (id + empty 여부) 전달
      if (node?.id) onEditNodeClick?.(node.id, { empty: isEmptyNode(node) });
    },
    [editMode, onNodeClickInViewMode, onEditNodeClick]
  );

  /* + 버튼: 임시 노드 추가 */
  const addSiblingNode = useCallback(async () => {
    if (!lastSelectedId) return;
    const base = nodes.find((n) => n.id === lastSelectedId);
    if (!base) return;

    // 가드: 현재(기준) 노드가 비어 있으면 새 노드 생성 차단 + 오류 알림
    if (isEmptyNode(base)) {
      const msg =
        "현재 노드에 내용이 없습니다. 내용을 채운 뒤에 새 분기를 추가하세요.";
      if (typeof onError === "function") {
        onError({ code: "EMPTY_BASE_NODE", nodeId: base.id, message: msg });
      } else {
        alert(msg);
      }
      emitError("현재 노드에 내용이 없습니다. 먼저 내용을 채워주세요.");
      return;
    }

    const childIds = getChildren(edges, base.id);
    const idx = childIds.length;
    const col = Math.floor(idx / MAX_PER_COL);
    const row = idx % MAX_PER_COL;

    const draftX = (base.position?.x ?? 0) + H_SPACING * (col + 1);
    const draftY = (base.position?.y ?? 0) + zigzag(row) * V_SPACING;

    const { x, y } = findFreeSpot(nodes, draftX, draftY);

    const newId = `n-${Date.now()}`;
    const newNodeBase = {
      id: newId,
      type: "qa",
      position: { x, y },
      data: {
        __temp: true,
        branch: activeBranch !== "전체" ? activeBranch : undefined,
        label: "검색에서 선택하세요",
        summary: "",
        question: "",
        answer: "",
      },
      style: tempNodeStyle,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    };

    setNodes((nds) => [...nds, newNodeBase]);
    setEdges((eds) => [
      ...eds,
      {
        ...makeEdge(base.id, newId),
        ...edgeStyle,
        type: "deletable",
        data: { onRemove: removeEdgeById },
      },
    ]);

    onCreateNode?.(newId, null, { source: "plus" });

    if (childIds.length >= 1 && typeof askBranchName === "function") {
      const name = await askBranchName(base.id, newId);
      if (!name || !name.trim()) {
        // 롤백
        setNodes((nds) => nds.filter((n) => n.id !== newId));
        setEdges((eds) =>
          eds.filter((e) => !(e.source === base.id && e.target === newId))
        );
        return;
      }
      const trimmed = name.trim();
      setNodes((nds) =>
        nds.map((n) =>
          n.id === newId ? { ...n, data: { ...n.data, branch: trimmed } } : n
        )
      );
      onBranchSaved?.(newId, base.id, trimmed);
    }
  }, [
    lastSelectedId,
    nodes,
    edges,
    activeBranch,
    onCreateNode,
    askBranchName,
    onBranchSaved,
    setNodes,
    setEdges,
    removeEdgeById,
    emitError,
    onError,
  ]);

  /* 노드 삭제 */
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
          .map(({ s, t }) => ({
            ...makeEdge(s, t),
            ...edgeStyle,
            type: "deletable",
            data: { onRemove: removeEdgeById },
          }));
        return [...other, ...reattached];
      }
      return other;
    });

    setNodes((nds) => nds.filter((n) => n.id !== lastSelectedId));
    setLastSelectedId(null);
    setSelectedNodes([]);
    onSelectionCountChange?.(0, false);
  }, [
    lastSelectedId,
    setEdges,
    setNodes,
    onSelectionCountChange,
    removeEdgeById,
  ]);

  /* 루트 핸들/오프셋 */
  const didInitialRootOffset = useRef(false);

  useEffect(() => {
    setNodes((prev) =>
      withHandlesByRoot(prev, edges, { keepTargetForRoots: true })
    );
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* 리셋/라벨 업데이트 */
  const reset = useCallback(() => {
    setNodes(
      withHandlesByRoot(
        initialNodes.map((n) => ({ ...n, type: "qa", style: nodeStyle })),
        initialEdges,
        { keepTargetForRoots: true }
      )
    );
    setEdges(initialEdges.map(stripRuntimeEdge));
    setLastSelectedId(null);
    setSelectedNodes([]);
    onSelectionCountChange?.(0, false);
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
        setEdges((eds) =>
          eds.filter((e) => e.source !== nodeId && e.target !== nodeId)
        );
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

          if (payload.type === "group") {
            const g = payload.graph ?? { nodes: [], edges: [] };
            return {
              ...n,
              style: nodeStyle,
              data: {
                ...n.data,
                __temp: false,
                type: "group",
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
              type: "result",
              label: payload.label || payload.question || "질문",
              summary: (payload.answer || "").slice(0, 140),
              question: payload.question || payload.label || "",
              answer: payload.answer || "",
              tags: payload.tags || [],
              date: payload.date,
            },
          };
        })
      );
    },
    [setNodes]
  );

  /* === 저장 검증: 루트 1개 & 임시 노드 0개 === */
  const validateForSave = useCallback(() => {
    const errors = [];
    const incoming = computeIncomingMap(edges);
    const roots = nodes.filter((n) => !incoming.has(n.id));
    if (roots.length !== 1) {
      errors.push(`루트 노드는 1개여야 해요. (현재 ${roots.length}개)`);
    }
    const tempCount = nodes.filter((n) => n?.data?.__temp).length;
    if (tempCount > 0) {
      errors.push(
        `아직 검색하지 않은 노드 ${tempCount}개가 남아 있어요. 내용을 채우거나 제거해 주세요.`
      );
    }
    return { ok: errors.length === 0, errors };
  }, [nodes, edges]);

  /* 메서드 외부 노출 */
  useImperativeHandle(
    ref,
    () => ({
      reset,
      groupSelected: () => {},
      updateNodeLabel,
      applyContentToNode,
      discardTempNode,
      validateForSave, // ★ 저장 검증 노출
    }),
    [
      reset,
      updateNodeLabel,
      applyContentToNode,
      discardTempNode,
      validateForSave,
    ]
  );

  /* 변경 감지 → Reset 가능 여부 */
  useEffect(() => {
    const now = { nodes: serializeNodes(nodes), edges: serializeEdges(edges) };
    const base = initialSnapshotRef.current;
    const changed = now.nodes !== base.nodes || now.edges !== base.edges;
    onCanResetChange?.(changed);
  }, [nodes, edges, onCanResetChange]);

  /* 브랜치 필터링 */
  const visibleNodes = useMemo(() => {
    if (activeBranch === "전체") return nodes;
    return nodes.filter((n) => n?.data?.branch === activeBranch);
  }, [nodes, activeBranch]);

  const visibleIdSet = useMemo(
    () => new Set(visibleNodes.map((n) => n.id)),
    [visibleNodes]
  );

  const visibleEdges = useMemo(() => {
    if (activeBranch === "전체") return edges;
    return edges.filter(
      (e) => visibleIdSet.has(e.source) && visibleIdSet.has(e.target)
    );
  }, [edges, activeBranch, visibleIdSet]);

  /* 상호작용 옵션 */
  const rfInteractivity = useMemo(
    () => ({
      nodesDraggable: editMode,
      nodesConnectable: editMode,
      elementsSelectable: editMode,
      edgesFocusable: true,
      connectOnClick: editMode,
      panOnDrag: true,
      panOnScroll: !editMode,
      zoomOnScroll: editMode,
    }),
    [editMode]
  );

  /* DnD */
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      const payload = getPayloadFromDT(e.dataTransfer, [
        DND_MIME_RESULT,
        DND_MIME_GROUP,
      ]);
      if (!payload) return;

      const pos = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const { x, y } = findFreeSpot(nodes, pos.x, pos.y);

      if (payload.type === "group" && payload.title) {
        const id = `g-${payload.id}-${Date.now()}`;
        const graph = payload.graph ?? { nodes: [], edges: [] };
        const summary = payload.summary || "";
        const newNode = {
          id,
          type: "qa",
          position: { x, y },
          data: {
            type: "group",
            label: payload.title,
            summary,
            group: graph,
            branch: activeBranch !== "전체" ? activeBranch : undefined,
          },
          style: nodeStyle,
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        };
        setNodes((nds) => [...nds, newNode]);
        onCreateNode?.(id, payload, { source: "dnd" });
        return;
      }

      const id = `q-${payload.id ?? "adhoc"}-${Date.now()}`;
      const newNode = {
        id,
        type: "qa",
        position: { x, y },
        data: {
          branch: activeBranch !== "전체" ? activeBranch : undefined,
          type: "result",
          label: payload.label || payload.question || "질문",
          summary: (payload.answer || "").slice(0, 140),
          question: payload.question || "",
          answer: payload.answer || "",
          tags: payload.tags || [],
        },
        style: nodeStyle,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
      setNodes((nds) => [...nds, newNode]);
      onCreateNode?.(id, payload, { source: "dnd" });
    },
    [nodes, rf, setNodes, onCreateNode, activeBranch]
  );

  return (
    <FlowWrap>
      <ReactFlow
        nodes={visibleNodes}
        edges={visibleEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
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

export default FlowCore;
