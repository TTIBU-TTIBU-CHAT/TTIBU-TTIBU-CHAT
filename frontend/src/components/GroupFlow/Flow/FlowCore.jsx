import {
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
  MIN_ZOOM,
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
import {
  edge as makeEdge,
  stripRuntimeEdge,
  serializeEdges,
  serializeNodes,
} from "../utils";

/* 최대 노드 개수 제약 */
const MAX_NODES = 10;

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
    groupData,
    onCanResetChange,
    onSelectionCountChange,
    onNodeClickInViewMode,
    onCreateNode,
    onError,
  },
  ref
) {
  const didInitRef = useRef(false);

  const nodeTypes = useMemo(() => ({ qa: QaNode }), []);
  const edgeTypes = useMemo(() => ({ deletable: DeletableEdge }), []);

  // 기본값은 빈 배열
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  /* ========================
    그룹 데이터 수신 시 그래프 세팅
  ======================== */
  useEffect(() => {
    if (!groupData || !groupData.originNodeDetails) return;

    console.log("[FLOW] 그룹 데이터 수신:", groupData);

    const newNodes = groupData.originNodeDetails.map((n, idx) => ({
      id: `n${n.nodeId}`,
      type: "qa",
      position: { x: idx * 300, y: 0 }, // 간단한 좌표 배치
      data: {
        nodeId: n.nodeId,
        label: n.question || `노드 ${n.nodeId}`,
        summary: n.summary || "",
        question: n.question,
        answer: n.answer,
        keyword: n.keyword || [],
      },
      style: nodeStyle,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    }));

    // 순차 연결용 엣지 구성 (originNodes 순서대로 연결)
    const newEdges =
      groupData.originNodes?.slice(0, -1).map((srcId, idx) => ({
        id: `e${srcId}-${groupData.originNodes[idx + 1]}`,
        source: `n${srcId}`,
        target: `n${groupData.originNodes[idx + 1]}`,
        type: "deletable",
        style: edgeStyle,
        data: { onRemove: () => {} },
      })) ?? [];

    setNodes(newNodes);
    setEdges(newEdges);
  }, [groupData, setNodes, setEdges]);

  /* 공통: 노드 용량 가드 */
  const ensureCapacity = useCallback(() => {
    if (nodes.length >= MAX_NODES) {
      onError?.({
        code: "MAX_NODES",
        message: `노드는 최대 ${MAX_NODES}개까지 추가할 수 있어요.`,
      });
      return false;
    }
    return true;
  }, [nodes.length, onError]);

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
  /* 빈 노드(내용 없음/임시) 판별 */
  const isEmptyNode = (n) =>
    !!n?.data?.__temp ||
    (!n?.data?.type && !n?.data?.question && !n?.data?.answer);
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
      setEdges((eds) => {
        const next = addEdge(
          {
            ...params,
            ...edgeStyle,
            type: "deletable",
            data: { onRemove: removeEdgeById },
          },
          eds
        );
        // ★ 엣지 변경 즉시 핸들 재계산
        setNodes((prev) =>
          withHandlesByRoot(prev, next, { keepTargetForRoots: true })
        );
        return next;
      });
    },
    [edges, setEdges, removeEdgeById, setNodes]
  );

  /* ===== 엣지 업데이트(드래그로 재연결) ===== */
  const onEdgeUpdate = useCallback(
    (oldEdge, newConn) => {
      setEdges((eds) => {
        const remaining = eds.filter((e) => e.id !== oldEdge.id);

        const hasChild = remaining.some((e) => e.source === newConn.source);
        const hasParent = remaining.some((e) => e.target === newConn.target);
        if (hasChild || hasParent) {
          console.warn("[Linear] Reject onEdgeUpdate", {
            hasChild,
            hasParent,
            newConn,
          });
          const back = [...remaining, oldEdge];
          setNodes((prev) =>
            withHandlesByRoot(prev, back, { keepTargetForRoots: true })
          );
          return back;
        }

        const next = addEdge(
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
        setNodes((prev) =>
          withHandlesByRoot(prev, next, { keepTargetForRoots: true })
        );
        return next;
      });
    },
    [setEdges, removeEdgeById, setNodes]
  );

  /* ===== 선택/보기 모드 ===== */
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
        onNodeClickInViewMode?.(node?.id, { empty: isEmptyNode(node) }); // 뷰 모드 클릭 메타 전달
        return;
      }
      setLastSelectedId(node?.id || null);
    },
    [editMode, onNodeClickInViewMode]
  );

  /* ===== (+) 새 "임시" 노드 추가: 내용은 나중에 주입 ===== */
  const addNextNode = useCallback(() => {
    if (!ensureCapacity()) return; // ★ 용량 가드

    const tail = getTail(nodes, edges);
    const baseX = tail ? (tail.position?.x ?? 0) : 0;
    const baseY = tail ? (tail.position?.y ?? 0) : 0;

    // ★ 부모(꼬리)가 비어 있으면 추가 차단
    if (tail && isEmptyNode(tail)) {
      onError?.({
        code: "EMPTY_PARENT",
        message:
          "현재 노드에 내용이 없어요. 먼저 내용을 채우거나 카드/그룹을 꽂은 뒤 새 노드를 추가하세요.",
      });
      return;
    }
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
  }, [
    nodes,
    edges,
    setNodes,
    onCreateNode,
    tryAddLinearEdge,
    onError,
    ensureCapacity,
  ]);

  /* ===== 노드 삭제 ===== */
  const removeSelectedNode = useCallback(() => {
    if (!lastSelectedId) return;

    setEdges((eds) => {
      const incoming = eds.filter((e) => e.target === lastSelectedId);
      const outgoing = eds.filter((e) => e.source === lastSelectedId);
      const other = eds.filter(
        (e) => e.source !== lastSelectedId && e.target !== lastSelectedId
      );

      let next = other;
      if (incoming.length === 1 && outgoing.length === 1) {
        const parentId = incoming[0].source;
        const childId = outgoing[0].target;
        const parentHasChild = other.some((e) => e.source === parentId);
        const childHasParent = other.some((e) => e.target === childId);
        if (!parentHasChild && !childHasParent) {
          next = [
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
      setNodes((prev) =>
        withHandlesByRoot(prev, next, { keepTargetForRoots: true })
      );
      return next;
    });

    setNodes((nds) => nds.filter((n) => n.id !== lastSelectedId));
    setLastSelectedId(null);
    setSelectedNodes([]);
    onSelectionCountChange?.(0);
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
      return prev.map((n) =>
        !incoming.has(n.id)
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
    onSelectionCountChange?.(0);
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
                nodeId: payload.id ?? n.data?.nodeId,
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
              nodeId: payload.id ?? n.data?.nodeId,
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
  const validateForSaveNow = useCallback(() => {
    const errors = [];
    // 1) 루트 개수 확인
    const incoming = computeIncomingMap(edges);
    const roots = nodes.filter((n) => !incoming.has(n.id));
    if (roots.length !== 1) {
      errors.push(`루트 노드는 1개여야 해요. (현재 ${roots.length}개)`);
    }
    // 2) 노드 개수 확인
    if (nodes.length > MAX_NODES) {
      errors.push(
        `노드는 최대 ${MAX_NODES}개까지 저장할 수 있어요. (현재 ${nodes.length}개)`
      );
    }

    // 3) 임시 노드 존재 여부 (__temp)
    const tempCount = nodes.filter((n) => n?.data?.__temp).length;
    if (tempCount > 0) {
      errors.push(
        `아직 검색하지 않은 노드 ${tempCount}개가 남아 있어요. 내용을 채우거나 제거해 주세요.`
      );
    }
    // (옵션) 선형 제약 검증도 병행
    const linear = validateLinear(nodes, edges);
    if (linear && !linear.ok) {
      errors.push(...(linear.errors || []));
    }
    return { ok: errors.length === 0, errors };
  }, [nodes, edges]);
  // 🔹 연결된 순서대로 백엔드 nodeId 배열 추출
  const getOrderedNodeIds = useCallback(() => {
    // 1) 루트 찾기 (incoming edge 없는 노드)
    const incoming = computeIncomingMap(edges);
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const roots = nodes.filter((n) => !incoming.has(n.id));

    if (roots.length !== 1) {
      console.warn("[FLOW_CORE] getOrderedNodeIds: 루트가 1개가 아닙니다.", {
        roots,
      });
    }

    const ordered = [];
    const visited = new Set();
    let current = roots[0] || null;

    while (current && !visited.has(current.id)) {
      visited.add(current.id);

      const backendId = current.data?.nodeId ?? current.data?.id ?? null;

      if (backendId != null) {
        ordered.push(backendId);
      } else {
        console.warn("[FLOW_CORE] nodeId가 없는 노드가 있습니다:", current);
      }

      const nextEdge = edges.find((e) => e.source === current.id);
      if (!nextEdge) break;
      current = nodeMap.get(nextEdge.target);
    }

    console.log("[FLOW_CORE] 현재 nodes:", nodes);
    console.log("[FLOW_CORE] 현재 edges:", edges);
    console.log("[FLOW_CORE] 순서대로 추출된 nodeId 배열:", ordered);

    return ordered;
  }, [nodes, edges]);
  // 저장 검증/조작 메서드 노출
  useImperativeHandle(
    ref,
    () => ({
      reset,
      updateNodeLabel,
      validateForSave: validateForSaveNow,
      applyContentToNode,
      discardTempNode,
      getOrderedNodeIds,
    }),
    [
      reset,
      updateNodeLabel,
      validateForSaveNow,
      applyContentToNode,
      discardTempNode,
      getOrderedNodeIds,
    ]
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
      if (!ensureCapacity()) return; // ★ 용량 가드 (드롭도 차단)

      const payload = getPayloadFromDT(e.dataTransfer, [
        DND_MIME_RESULT,
        DND_MIME_GROUP,
      ]);
      if (!payload) return;

      const tail = getTail(nodes, edges);
      // 드롭으로도 tail에 자동 연결되므로, tail이 비어있으면 차단
      if (tail && isEmptyNode(tail)) {
        onError?.({
          code: "EMPTY_PARENT",
          message:
            "현재 마지막 노드가 비어있습니다. 내용을 채운 뒤에 카드를 드롭해 연결해주세요.",
        });
        return;
      }
      const baseX = tail ? (tail.position?.x ?? 0) : 0;
      const baseY = tail ? (tail.position?.y ?? 0) : 0;
      const draftX = baseX + H_SPACING;
      const draftY = baseY;
      const { x, y } = findFreeSpot(nodes, draftX, draftY);

      if (payload.type === "group") {
        const id = `grp_${payload.id}_${Date.now()}`;
        const g = payload.graph ?? { nodes: [], edges: [] };
        const label = payload.title || "Group";
        const summary = payload.summary || "";

        const newNode = {
          id,
          type: "qa",
          position: { x, y },
          data: {
            type: "group",
            label,
            summary,
            group: g,
            nodeId: payload.id, // ★ 그룹 카드의 원본 id 저장(있다면)
          },
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
          nodeId: payload.id,
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
    [
      nodes,
      edges,
      setNodes,
      onCreateNode,
      tryAddLinearEdge,
      ensureCapacity,
      onError,
    ]
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
