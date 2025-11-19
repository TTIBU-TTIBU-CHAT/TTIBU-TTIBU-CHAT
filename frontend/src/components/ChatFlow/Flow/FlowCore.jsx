// src/components/ChatFlow/Flow/FlowCore.jsx
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
import DeletableEdge from "../Edges/DeletableEdge";
import SelectionOverlay from "../Overlays/SelectionOverlay";
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
  border: "2px #9AD7B8",
  background: "#F6FBF8",
  opacity: 0.9,
  boxShadow: "inset 0 0 0 2px rgba(154,215,184,.25)",
};

/* 🔧 FlowCore 내부 디버그용 플래그 */
const DEBUG_FLOW_CORE = false;

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
    // ⬇️ ChatFlowPage에서 직접 주입되는 RF 포맷
    nodes: propNodes = [],
    edges: propEdges = [],
  },
  ref
) {
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

  const removeEdgeById = useCallback(
    (edgeId) => setEdges((eds) => eds.filter((e) => e.id !== edgeId)),
    [setEdges]
  );

  /* 🔥 props → 내부 nodes 동기화 */
  useEffect(() => {
    const normalized = withHandlesByRoot(
      (propNodes ?? []).map((n) => ({
        ...n,
        type: n.type ?? "qa",
        style: { ...nodeStyle, ...(n.style || {}) },
        sourcePosition: n.sourcePosition ?? Position.Right,
        targetPosition: n.targetPosition ?? Position.Left,
      })),
      propEdges ?? []
    );

    // ✅ 핵심 수정: serialize 비교를 제거하고, 부모에서 내려준 상태를 그대로 반영
    setNodes(normalized);
  }, [propNodes, propEdges, setNodes]);

  /* 🔥 props → 내부 edges 동기화 */
  useEffect(() => {
    const normalized = (propEdges ?? []).map((e) => ({
      ...e,
      ...edgeStyle,
      type: "deletable",
      data: { ...(e.data || {}), onRemove: (id) => removeEdgeById(id) },
    }));

    // ✅ 핵심 수정: 마찬가지로 serialize 비교 제거
    setEdges(normalized);
  }, [propEdges, setEdges, removeEdgeById]);

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

  useEffect(() => {
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        type: "deletable",
        data: { ...(e.data || {}), onRemove: removeEdgeById },
      }))
    );
  }, [removeEdgeById, setEdges]);

  const onConnect = useCallback(
    async (params) => {
      const parentId = String(params.source);
      const childId = String(params.target);

      // 1) 새 엣지 포함한 nextEdges를 직접 계산
      const currentEdges = edges ?? [];
      const newEdge = {
        ...params,
        ...edgeStyle,
        type: "deletable",
        data: { onRemove: removeEdgeById },
      };
      const nextEdges = addEdge(newEdge, currentEdges);

      // 2) ReactFlow 상태 업데이트
      setEdges(nextEdges);

      // 3) 부모의 자식 수 계산
      const childEdges = nextEdges.filter((e) => String(e.source) === parentId);
      const childCount = childEdges.length;

      console.log("[onConnect] 엣지 연결:", {
        parentId,
        childId,
        childCount,
        description: childCount === 1 ? "첫 번째 자식 - 부모 브랜치 상속" : "두 번째 이후 자식 - 새 브랜치 생성"
      });

      // 4) 브랜치 처리
      const targetNode = nodes.find((n) => n.id === childId);
      const alreadyBranch =
        targetNode?.data?.branch ?? targetNode?.data?.branch_name;

      if (alreadyBranch) {
        console.log("[onConnect] 이미 브랜치가 설정된 노드:", alreadyBranch);
        return;
      }

      if (childCount === 1) {
        // ✅ 첫 번째 자식 → 부모 branch 상속
        const parentNode = nodes.find((n) => n.id === parentId);
        const parentBranch = parentNode?.data?.branch ?? parentNode?.data?.branch_id;

        console.log("[onConnect] 첫 번째 자식 - 부모 브랜치 상속:", {
          parentId,
          parentBranch,
          childId
        });

        if (parentBranch) {
          setNodes((nds) =>
            nds.map((n) =>
              n.id === childId
                ? { ...n, data: { ...(n.data || {}), branch: parentBranch } }
                : n
            )
          );
        }
      } else if (childCount >= 2 && typeof askBranchName === "function") {
        // ✅ 두 번째 이후 자식 → 새 브랜치 생성 + 브랜치명 입력
        console.log("[onConnect] 두 번째 이후 자식 - 브랜치명 입력 모달 호출");

        const name = await askBranchName(parentId, childId);

        if (!name || !name.trim()) {
          console.log("[onConnect] 브랜치명 입력 취소 - 엣지 제거");
          // 사용자가 취소하면 방금 추가한 엣지 제거
          setEdges((eds) => eds.filter((e) => !(String(e.source) === parentId && String(e.target) === childId)));
          return;
        }

        const trimmed = name.trim();
        console.log("[onConnect] 브랜치명 입력 완료:", trimmed);

        setNodes((nds) =>
          nds.map((n) =>
            n.id === childId
              ? { ...n, data: { ...(n.data || {}), branch: trimmed } }
              : n
          )
        );

        onBranchSaved?.(childId, parentId, trimmed);
      }
    },
    [
      edges,
      nodes,
      setEdges,
      setNodes,
      removeEdgeById,
      askBranchName,
      onBranchSaved,
    ]
  );

  useEffect(() => {
    if (!editMode) {
      setSelectedNodes([]);
      setLastSelectedId(null);
      onSelectionCountChange?.(0, false, []);
    }
  }, [editMode, onSelectionCountChange]);

  const handleSelectionChange = useCallback(
    ({ nodes: selNodes }) => {
      if (!editMode) {
        setSelectedNodes([]);
        setLastSelectedId(null);
        onSelectionCountChange?.(0, false, []);
        return;
      }
      const list = selNodes || [];
      setSelectedNodes(list);
      const containsGroup = list.some(
        (n) => n?.data?.type === "GROUP" || !!n?.data?.group
      );
      onSelectionCountChange?.(list.length, containsGroup, list);
      if (list.length === 0) setLastSelectedId(null);
    },
    [editMode, onSelectionCountChange]
  );

  const isEmptyNode = (n) => {
    return (
      !!n?.data?.__temp ||
      (!n?.data?.type &&
        !n?.data?.question &&
        !n?.data?.answer &&
        !n?.data?.raw?.type)
    );
  };

  const onNodeClick = useCallback(
    (e, node) => {
      if (!editMode) {
        e?.preventDefault?.();
        e?.stopPropagation?.();
        onNodeClickInViewMode?.(node?.id, { empty: isEmptyNode(node) });
        return;
      }
      setLastSelectedId(node?.id || null);
      if (node?.id) onEditNodeClick?.(node.id, { empty: isEmptyNode(node) });
    },
    [editMode, onNodeClickInViewMode, onEditNodeClick]
  );

  const addSiblingNode = useCallback(async () => {
    if (!lastSelectedId) return;
    const base = nodes.find((n) => n.id === lastSelectedId);
    if (!base) return;

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

    const newId = `${Date.now()}`;
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
        nds.map((n) => {
          if (n.id !== id) return n;

          const { __temp, ...restData } = n.data || {};

          return {
            ...n,
            data: {
              ...restData,
              label,
            },
          };
        })
      );
    },
    [setNodes]
  );

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

  // 🔥 임시 노드뿐만 아니라 일반 노드도 제거 (DnD placeholder 제거용)
  const removeNode = useCallback(
    (nodeId) => {
      if (!nodeId) return;
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) =>
        eds.filter((e) => e.source !== nodeId && e.target !== nodeId)
      );
    },
    [setNodes, setEdges]
  );

  const applyContentToNode = useCallback(
    (nodeId, payload) => {
      if (!nodeId || !payload) return;
      console.log("[FlowCore] applyContentToNode:", {
        nodeId,
        type: payload.type,
        color: payload.color,
      });

      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n;

          // ✅ mutation 대신 새 data 객체 생성
          const { __temp, ...restData } = n.data ?? {};

          // GROUP 콘텐츠
          if (payload.type === "group" || payload.type === "GROUP") {
            const g = payload.graph ?? { nodes: [], edges: [] };
            const color = payload.color || null;
            return {
              ...n,
              style: {
                ...nodeStyle,
                ...(color ? { background: color } : {}),
              },
              data: {
                ...restData,
                type: "GROUP",
                label: payload.title || restData.label || "Group",
                summary: payload.summary || "",
                group: g,
                color,
              },
            };
          }

          // CHAT 콘텐츠 (SearchContent)
          return {
            ...n,
            style: nodeStyle,
            data: {
              ...restData,
              type: "CHAT",
              label: payload.label || payload.question || "질문",
              summary: (payload.answer || "").slice(0, 140),
              question: payload.question || payload.label || "",
              answer: payload.answer || "",
              keywords: payload.keywords || [],
              date: payload.date,
            },
          };
        })
      );
    },
    [setNodes]
  );

  const validateForSave = useCallback(() => {
    const errors = [];
    const incoming = computeIncomingMap(edges);
    const roots = nodes.filter((n) => !incoming.has(n.id));
    console.log("validateForSave", roots);
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

  const getSnapshot = useCallback(() => {
    const snapNodes = (nodes ?? []).map((n) => ({
      id: n.id,
      x: n.position?.x ?? 0,
      y: n.position?.y ?? 0,
      position: {
        x: n.position?.x ?? 0,
        y: n.position?.y ?? 0,
      },
      data: n.data ?? {},
    }));

    const snapEdges = (edges ?? []).map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
    }));

    const snap = { nodes: snapNodes, edges: snapEdges };

    if (DEBUG_FLOW_CORE) {
      console.log("[FLOW_CORE_DEBUG] snapshot:", snap);
    }
    return snap;
  }, [nodes, edges]);

  useImperativeHandle(
    ref,
    () => ({
      reset,
      groupSelected: () => {},
      updateNodeLabel,
      applyContentToNode,
      discardTempNode,
      removeNode,
      validateForSave,
      getSnapshot,
    }),
    [
      reset,
      updateNodeLabel,
      applyContentToNode,
      discardTempNode,
      removeNode,
      validateForSave,
      getSnapshot,
    ]
  );

  useEffect(() => {
    const now = {
      nodes: serializeNodes(nodes),
      edges: serializeEdges(edges),
    };
    const base = initialSnapshotRef.current;
    const changed = now.nodes !== base.nodes || now.edges !== base.edges;
    onCanResetChange?.(changed);
  }, [nodes, edges, onCanResetChange]);

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
      console.log("[FlowCore] handleDrop → color:", payload.color);
      const pos = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const { x, y } = findFreeSpot(nodes, pos.x, pos.y);

      // GROUP 드롭
      if (payload.type === "group" && payload.title) {
        const id = `g-${payload.id}-${Date.now()}`;
        const graph = payload.graph ?? { nodes: [], edges: [] };
        const color = payload.color || null;
        const summary = payload.summary || "";
        const newNode = {
          id,
          type: "qa",
          position: { x, y },
          data: {
            type: "GROUP",
            label: payload.title,
            summary,
            group: graph,
            branch: activeBranch !== "전체" ? activeBranch : undefined,
            color,
          },
          style: {
            ...nodeStyle,
            ...(color ? { background: color } : {}),
          },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        };
        setNodes((nds) => [...nds, newNode]);
        onCreateNode?.(id, payload, { source: "dnd" });
        return;
      }

      // CHAT 드롭 (SearchContent)
      const id = `q-${payload.id ?? "adhoc"}-${Date.now()}`;
      const newNode = {
        id,
        type: "qa",
        position: { x, y },
        data: {
          branch: activeBranch !== "전체" ? activeBranch : undefined,
          type: "CHAT",
          label: payload.label || payload.question || "질문",
          summary: (payload.answer || "").slice(0, 140),
          question: payload.question || "",
          answer: payload.answer || "",
          keywords: payload.keywords || [],
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
        nodes={nodes}
        edges={edges}
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
