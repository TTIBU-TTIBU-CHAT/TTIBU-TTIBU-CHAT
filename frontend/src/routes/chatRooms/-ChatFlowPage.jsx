// src/routes/chatrooms/-ChatFlowPage.jsx
import { useCallback, useRef, useState, useEffect, useMemo } from "react";
import { useParams, useRouterState } from "@tanstack/react-router";
import { useChatList } from "@/hooks/useChatList";
import BranchDropdown from "@/components/BranchDropdown/BranchDropdown";
import TopleftCard from "@/components/topleftCard/TopleftCard";
import ModalShell from "@/components/ModalShell/ModalShell";
import FlowCanvas from "@/components/ChatFlow/FlowCanvas";
import * as S from "./-styles.ChatFlowPage";
import InputDialog from "@/components/common/Modal/InputDialog";
import ErrorDialog from "@/components/common/Modal/ErrorDialog";
import { useRoom, useSaveRoomData } from "@/hooks/useChatRooms";
import { useSSEStore } from "@/store/useSSEStore";
import { useCreateGroup } from "@/hooks/useGroups";
import {
  useAttachChatFromExisting,
  useAttachGroup,
} from "@/hooks/useRoomChats";
import {
  LS_BRANCH_BY_NODE,
  LS_PENDING_MSGS,
  loadJSON,
  saveJSON,
} from "./-chatFlow.storage";


import {
  ensurePositions,
  mergeNodes,
  uniqEdges,
  updateNodeByChatId,
  toRF,
  toChatMessages,
  deriveViews,
} from "./-chatFlow.utils";


/* ======================================================================= */
/* 🔧 디버그 플래그: 필요할 때만 true 로 바꿔서 사용 */
const DEBUG_FLOW = true;

/* ======================================================================= */
/* 🧠 parent / children 필드 채우는 헬퍼                                   */
/* ======================================================================= */
function attachParentChildren(graph) {
  if (!graph) return graph;

  const nodes = graph.nodes ?? [];
  const edges = graph.edges ?? [];

  const parentMap = new Map(); // childChatId -> parentChatId
  const childrenMap = new Map(); // parentChatId -> [childChatId]

  edges.forEach((e) => {
    if (!e) return;
    const s = Number(e.source);
    const t = Number(e.target);
    if (Number.isNaN(s) || Number.isNaN(t)) return;

    parentMap.set(t, s);

    const arr = childrenMap.get(s) ?? [];
    arr.push(t);
    childrenMap.set(s, arr);
  });

  const nextNodes = nodes.map((n) => {
    const cidRaw = n?.chat_id ?? n?.id ?? n?.node_id;
    const cid = cidRaw !== undefined && cidRaw !== null ? Number(cidRaw) : null;

    if (cid === null || Number.isNaN(cid)) {
      return {
        ...n,
        parent: null,
        children: [],
      };
    }

    return {
      ...n,
      parent: parentMap.get(cid) ?? null,
      children: childrenMap.get(cid) ?? [],
    };
  });

  return {
    ...graph,
    nodes: nextNodes,
  };

}

/* ======================================================================= */
/* 🧠 branchViews를 nodes/edges 기준으로 재구성하는 헬퍼                    */
/* ======================================================================= */
function rebuildBranchViewsFromNodes(nodes, edges, roomId, prevBranchViews) {
  const prevBranches = prevBranchViews?.branches ?? {};
  const branches = {};
  let maxBranchNumber = prevBranchViews?.max_branch_number ?? 0;

  const nodeById = new Map(
    (nodes ?? []).map((n) => [Number(n.chat_id ?? n.id ?? n.node_id), n])
  );

  // 노드 기준으로 included_nodes 구성
  (nodes ?? []).forEach((n) => {
    const cidRaw = n?.chat_id ?? n?.id ?? n?.node_id;
    const cid = cidRaw !== undefined && cidRaw !== null ? Number(cidRaw) : null;
    const bIdRaw = n?.branch_id ?? n?.branchId ?? null;
    const bId = bIdRaw !== undefined && bIdRaw !== null ? Number(bIdRaw) : null;

    if (cid === null || Number.isNaN(cid)) return;
    if (bId === null || Number.isNaN(bId)) return;

    const key = String(bId);
    if (!branches[key]) {
      const prev = prevBranches[key];
      branches[key] = {
        branch_name: prev?.branch_name ?? "",
        included_nodes: [],
        included_edges: [],
      };
    }
    branches[key].included_nodes.push(cid);
    maxBranchNumber = Math.max(maxBranchNumber, bId);
  });

  // 엣지 기준으로 included_edges 구성 (source/target이 같은 branch에 속하는 경우)
  (edges ?? []).forEach((e) => {
    const s = Number(e.source);
    const t = Number(e.target);
    if (Number.isNaN(s) || Number.isNaN(t)) return;

    const sn = nodeById.get(s);
    const tn = nodeById.get(t);
    if (!sn || !tn) return;

    const sb = sn?.branch_id ?? sn?.branchId ?? null;
    const tb = tn?.branch_id ?? tn?.branchId ?? null;
    const sbNum = sb !== undefined && sb !== null ? Number(sb) : null;
    const tbNum = tb !== undefined && tb !== null ? Number(tb) : null;

    if (
      sbNum === null ||
      tbNum === null ||
      Number.isNaN(sbNum) ||
      Number.isNaN(tbNum) ||
      sbNum !== tbNum
    ) {
      return;
    }

    const key = String(sbNum);
    if (!branches[key]) {
      const prev = prevBranches[key];
      branches[key] = {
        branch_name: prev?.branch_name ?? "",
        included_nodes: [],
        included_edges: [],
      };
    }

    branches[key].included_edges.push({
      source: s,
      target: t,
    });
  });

  return {
    chat_room_id: Number(roomId),
    max_branch_number: maxBranchNumber,
    branches,
    last_updated: new Date().toISOString(),
  };
}

/* ======================================================================= */
/* 🧠 ReactFlow snapshot 기준으로 chatViews / branchViews 재구성            */
/* ======================================================================= */
function rebuildFromSnapshot(prevChatViews, prevBranchViews, snapshot, roomId) {
  const prevNodes = prevChatViews?.nodes ?? [];
  const prevEdges = prevChatViews?.edges ?? [];

  const prevById = new Map(
    prevNodes.map((n) => [Number(n.chat_id ?? n.id ?? n.node_id), n])
  );

  const snapNodes = Array.isArray(snapshot?.nodes) ? snapshot.nodes : [];
  const snapEdges = Array.isArray(snapshot?.edges) ? snapshot.edges : [];

  // snapshot에서 "도메인 노드(chat_id 기반)"로 볼 수 있는 id set 수집
  const domainIdSet = new Set();

  snapNodes.forEach((n) => {
    const cid = Number(n.id);
    if (!Number.isNaN(cid)) {
      domainIdSet.add(cid);
    }
  });

  snapEdges.forEach((e) => {
    const s = Number(e.source);
    const t = Number(e.target);
    if (!Number.isNaN(s)) domainIdSet.add(s);
    if (!Number.isNaN(t)) domainIdSet.add(t);
  });

  // 도메인 노드들만 재구성 (기존 도메인 데이터는 그대로 유지)
  const rebuiltNodes = Array.from(domainIdSet).map((cid) => {
    const prev = prevById.get(cid) || {};
    const snapNode = snapNodes.find((n) => Number(n.id) === cid);

    const pos = snapNode
      ? {
          x: snapNode.position?.x ?? snapNode.x ?? prev.position?.x ?? 0,
          y: snapNode.position?.y ?? snapNode.y ?? prev.position?.y ?? 0,
        }
      : (prev.position ?? { x: 0, y: 0 });

    return {
      ...prev,
      chat_id: cid,
      position: pos,
    };
  });

  // 도메인 엣지만 재구성 (source/target 둘 다 숫자인 것만)
  const rebuiltEdges = snapEdges
    .map((e) => {
      const s = Number(e.source);
      const t = Number(e.target);
      if (Number.isNaN(s) || Number.isNaN(t)) return null;
      return { source: s, target: t };
    })
    .filter(Boolean);

  // parent / children 부착
  const chatInfo = attachParentChildren({
    chat_room_id: Number(roomId),
    ...(prevChatViews ?? {}),
    nodes: rebuiltNodes,
    edges: rebuiltEdges,
    last_updated: new Date().toISOString(),
  });

  // branchViews 재구성 (branch_name은 가능한 유지)
  const branchView = rebuildBranchViewsFromNodes(
    chatInfo.nodes ?? [],
    chatInfo.edges ?? [],
    roomId,
    prevBranchViews
  );

  return { chatInfo, branchView };
}



/* ======================================================================= */

export default function ChatFlowPage() {
  /* ✅ URL 파라미터 (/chatrooms/$roomId) */
  const { nodeId } = useParams({ strict: false });
  const [roomId] = useState(nodeId);


  /* ✅ 라우터 state (NewChat → navigate 시 넘긴 roomInit) */
  const routeState = useRouterState();
  const roomInit = routeState?.location?.state?.roomInit;


  /* ✅ 서버 최신 데이터 */
  const {
    data: fetchedRoom,
    isLoading: roomLoading,
    error: roomError,
  } = useRoom(roomId);


  const apiRoomData = fetchedRoom?.data ?? fetchedRoom ?? null;
  const effectiveRoomData = roomInit ?? apiRoomData;

  /* --------------------------------------------------------------------- */
  const initialViews = useMemo(
    () => deriveViews(effectiveRoomData),
    [effectiveRoomData]
  );

  const [chatViews, setChatViews] = useState(
    attachParentChildren(initialViews.chatViews)
  );
  const [branchViews, setBranchViews] = useState(initialViews.branchViews);

  const latestBranchViewsRef = useRef(branchViews);
  useEffect(() => {
    latestBranchViewsRef.current = branchViews;
  }, [branchViews]);

  useEffect(() => {
    const next = deriveViews(effectiveRoomData);
    setChatViews(attachParentChildren(next.chatViews));
    setBranchViews(next.branchViews);
  }, [effectiveRoomData]);

  /* ------------------------ 채팅 리스트 (로컬 임시용) ------------------------ */
  const { messages, addUser, addAssistant } = useChatList([]);

  /* -------------------------- 저장 훅 -------------------------- */
  const saveRoomData = useSaveRoomData();
  const [pendingOps, setPendingOps] = useState({
    chatCopies: [], // { originUid, roomUid, nodeId, source }
    groupAttachments: [], // { roomId, group_id, nodeId, source }
  });

  const pendingOpsRef = useRef(pendingOps);
  useEffect(() => {
    pendingOpsRef.current = pendingOps;
  }, [pendingOps]);

  // 채팅 복사 예약
  const enqueueChatCopy = useCallback(
    ({ originUid, nodeId, source }) => {
      if (!originUid || !roomId) return;

      setPendingOps((prev) => {
        const exists = prev.chatCopies.some(
          (op) => op.originUid === originUid && op.nodeId === nodeId
        );
        if (exists) return prev; // 중복 방지

        return {
          ...prev,
          chatCopies: [
            ...prev.chatCopies,
            { originUid, roomUid: Number(roomId), nodeId, source },
          ],
        };
      });
    },
    [roomId]
  );

  // 그룹 붙이기 예약
  const enqueueGroupAttach = useCallback(
    ({ group_id, nodeId, source }) => {
      if (!group_id || !roomId) return;

      setPendingOps((prev) => {
        const exists = prev.groupAttachments.some(
          (op) => op.group_id === Number(group_id) && op.nodeId === nodeId
        );
        if (exists) return prev;

        return {
          ...prev,
          groupAttachments: [
            ...prev.groupAttachments,
            {
              roomId: Number(roomId),
              group_id: Number(group_id),
              nodeId,
              source,
            },
          ],
        };
      });
    },
    [roomId]
  );

  const persistViews = useCallback(
    (nextChatViews) => {
      const normalized = attachParentChildren(nextChatViews);
      const hasGraph =
        (normalized?.nodes?.length ?? 0) > 0 ||
        (normalized?.edges?.length ?? 0) > 0;
      const hasBranches =
        !!latestBranchViewsRef.current?.branches &&
        Object.keys(latestBranchViewsRef.current.branches).length > 0;

      if (!hasGraph && !hasBranches) {
        return;
      }
      saveRoomData.mutate({
        roomId,
        chatInfo: JSON.stringify(normalized),
        branchView: JSON.stringify(latestBranchViewsRef.current),
      });

    },
    [roomId, saveRoomData]
  );


  const persistBoth = useCallback(
    (nextChatViews, nextBranchViews) => {
      const normalized = attachParentChildren(nextChatViews);
      const hasGraph =
        (normalized?.nodes?.length ?? 0) > 0 ||
        (normalized?.edges?.length ?? 0) > 0;
      const hasBranches =
        !!nextBranchViews?.branches &&
        Object.keys(nextBranchViews.branches).length > 0;

      if (!hasGraph && !hasBranches) {
        return;
      }
      saveRoomData.mutate({
        roomId,
        chatInfo: JSON.stringify(normalized),
        branchView: JSON.stringify(nextBranchViews),
      });
    },
    [roomId, saveRoomData]
  );

  /* -------------------------- SSE / 스트림 관련 -------------------------- */
  const attachHandlers = useSSEStore((s) => s.attachHandlers);
  const sessionUuid = useSSEStore((s) => s.sessionUuid);

  const preStreamSavedRef = useRef(false);
  const streamRef = useRef({}); // { [chatId: string]: string }
  const [streamTick, setStreamTick] = useState(0);

  // ✨ 첫 CHAT_STREAM 에서만 모달 오픈 여부
  const firstStreamOpenedRef = useRef(false);

  /* ----------------------------- 라우트 / 상태 ----------------------------- */

  const pathname = routeState.location.pathname;
  const isGroups = pathname.startsWith("/groups");

  const [input, setInput] = useState("");
  const [editingNodeId, setEditingNodeId] = useState(null);

  const [branchOpen, setBranchOpen] = useState(false);
  // 드롭다운에서 선택된 항목 (value는 "전체" 또는 branch_id 문자열)
  const [activeBranchKey, setActiveBranchKey] = useState("전체");

  const [editMode, setEditMode] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelType, setPanelType] = useState("chat");
  const [canReset, setCanReset] = useState(false);

  const [selectedCount, setSelectedCount] = useState(0);
  const [hasGroupInSelection, setHasGroupInSelection] = useState(false);
  const [selectedNodesForGroup, setSelectedNodesForGroup] = useState([]);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState("");

  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [branchNameInput, setBranchNameInput] = useState("");
  const branchPromptResolverRef = useRef(null);

  // ✅ 여러 노드를 순차적으로 pending 처리하기 위한 스택
  // [{ nodeId, source: "plus" | "emptyClick" | "dnd" ... }]
  const [pendingNodes, setPendingNodes] = useState([]);

  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const canvasRef = useRef(null);
  const createGroup = useCreateGroup();


  const attachChatFromExisting = useAttachChatFromExisting();
  const attachGroupToRoom = useAttachGroup();


  /* --------------------------- 에러 핸들러 --------------------------- */
  const handleCoreError = useCallback(({ message }) => {
    setErrorMsg(message || "오류가 발생했습니다.");
    setErrorOpen(true);
  }, []);

  /* ----------------------------- 채팅 전송 ----------------------------- */
  const handleSend = useCallback(() => {
    const t = input.trim();
    if (!t) return;
    addUser(t);
    setInput("");
    setTimeout(() => addAssistant("응답: " + t), 300);

    if (editingNodeId) {
      canvasRef.current?.updateNodeLabel(editingNodeId, t);
      const branchMap = loadJSON(LS_BRANCH_BY_NODE, {});
      const pending = loadJSON(LS_PENDING_MSGS, []);
      pending.push({
        nodeId: editingNodeId,
        text: t,
        ts: Date.now(),
        branchName: branchMap[editingNodeId] || null,
      });
      saveJSON(LS_PENDING_MSGS, pending);
    }
  }, [input, addUser, addAssistant, editingNodeId]);

  /* ------------------------- FlowCanvas 조작 ------------------------- */
  const handleInit = () => canvasRef.current?.reset();

  const handleSave = useCallback(async () => {
    console.log("=== handleSave called ===", chatViews, branchViews);
    const result = canvasRef.current?.validateForSave?.();
    if (!result) return;

    if (!result.ok) {
      setErrorMsg(result.errors.join("\n"));
      setErrorOpen(true);
      return;
    }

    // 1) 현재 RF 스냅샷
    const snapshot = canvasRef.current?.getSnapshot?.() || {
      nodes: [],
      edges: [],
    };

    const snapNodes = Array.isArray(snapshot?.nodes) ? snapshot.nodes : [];

    // 1-1) RF 노드 id → {x,y} 맵
    const posMap = new Map(
      (snapNodes || []).map((n) => [
        String(n.id),
        {
          x: n.position?.x ?? n.x ?? 0,
          y: n.position?.y ?? n.y ?? 0,
        },
      ])
    );

    // ✅ 항상 snapshot 기준으로 한 번 재구성해서
    //    삭제/이동/연결 상태를 base로 만든다
    const { chatInfo: baseChatInfo, branchView: baseBranchView } =
      rebuildFromSnapshot(chatViews, branchViews, snapshot, roomId);

    // 1-2) RF id → 도메인 chat_id 맵 (기존 노드용)
    const flowIdToChatId = new Map();
    (baseChatInfo?.nodes ?? []).forEach((n) => {
      const cid = n.chat_id ?? n.id ?? n.node_id;
      if (cid == null) return;
      const fid = String(cid); // toRF가 chat_id 기반 id를 사용한다고 가정
      flowIdToChatId.set(fid, Number(cid));
    });

    // 2) 아직 서버에 안 보낸 작업들
    const { chatCopies, groupAttachments } = pendingOps;
    const hasPending =
      (chatCopies?.length ?? 0) > 0 || (groupAttachments?.length ?? 0) > 0;

    // 3) pending 작업이 *없을 때* → 순수 레이아웃/삭제만 반영해서 저장
    if (!hasPending) {
      setChatViews(baseChatInfo);
      setBranchViews(baseBranchView);
      latestBranchViewsRef.current = baseBranchView;

      debugLogRoomAndGraph("handleSave (no pendingOps, rebuilt)", {
        chatInfoOverride: baseChatInfo,
        branchViewOverride: baseBranchView,
      });

      persistBoth(baseChatInfo, baseBranchView);
      return;
    }

    // 🔍 pending 작업이 *있는 경우*:
    //    방금 만든 baseChatInfo/baseBranchView를 시작점으로
    //    복사를 순차적으로 누적
    debugLogRoomAndGraph(
      "handleSave (with pendingOps, sequential attach from snapshot base)",
      null
    );

    let nextChatViews = baseChatInfo;
    let nextBranchViews = baseBranchView;

    // 4) 채팅 복사 API (순차 처리)
    for (const { originUid, roomUid, nodeId } of chatCopies) {
      try {
        const res = await attachChatFromExisting.mutateAsync({
          originUid,
          roomUid,
        });

        console.log("[attachChatFromExisting] response:", res);

        const copyId = res?.data?.data?.copyId ?? res?.copyId ?? null;
        if (!copyId) {
          console.error("[attachChatFromExisting] copyId 없음:", res);
          continue;
        }

        const nodeKey = String(nodeId);

        // RF 스냅샷에서 이 노드의 position
        const pos = posMap.get(nodeKey) || {
          x: 0,
          y: 0,
        };

        // 스냅샷에서 이 Flow 노드 자체 찾기 (data/raw 복사용)
        const snapNodeForNew = snapNodes.find((n) => String(n.id) === nodeKey);

        // RF 스냅샷에서 부모 edge 찾기 (부모 → 현재)
        const parentEdge = (snapshot.edges ?? []).find(
          (e) => String(e.target) === nodeKey
        );

        // 부모 chat_id 계산
        let parentChatId = null;
        if (parentEdge) {
          const parentFlowId = String(parentEdge.source);
          parentChatId = flowIdToChatId.get(parentFlowId) ?? null;
        }

        // 자식이 여러 개인지 체크하기 위한 siblings
        const siblingEdges = parentEdge
          ? (snapshot.edges ?? []).filter(
              (e) => String(e.source) === String(parentEdge.source)
            )
          : [];

        const hasOtherChildren =
          parentEdge && siblingEdges.some((e) => String(e.target) !== nodeKey);

        // ✅ 현재까지 누적된 nextChatViews 기준으로 새 노드 추가
        const prevNodes = nextChatViews?.nodes ?? [];
        const prevEdges = nextChatViews?.edges ?? [];

        const originNode = prevNodes.find(
          (n) => Number(n.chat_id) === Number(originUid)
        );

        const fromSnapshotData =
          snapNodeForNew?.data?.raw ?? snapNodeForNew?.data ?? null;

        const baseNode = {
          ...(fromSnapshotData || {}),
          ...(originNode || {}),
        };

        let baseBranchId =
          baseNode?.branch_id ??
          baseNode?.branchId ??
          (parentChatId
            ? prevNodes.find((n) => Number(n.chat_id) === Number(parentChatId))
                ?.branch_id
            : null);

        let branchId = baseBranchId ?? null;

        // 🔹 부모가 이미 다른 자식이 있으면 → 새 branch id 생성
        if (hasOtherChildren) {
          const prevBV = latestBranchViewsRef.current ?? nextBranchViews;

          const branchIdsFromBV = Object.keys(prevBV?.branches ?? {})
            .map((k) => Number(k))
            .filter((v) => !Number.isNaN(v));

          const branchIdsFromNodes = prevNodes
            .map((n) => n?.branch_id ?? n?.branchId ?? null)
            .filter((v) => v != null)
            .map((v) => Number(v))
            .filter((v) => !Number.isNaN(v));

          const allIds = [...branchIdsFromBV, ...branchIdsFromNodes];

          const currentMax =
            allIds.length > 0
              ? Math.max(...allIds)
              : (prevBV?.max_branch_number ?? 0);

          branchId = currentMax + 1;
        }

        const newNode = {
          ...baseNode,
          chat_id: Number(copyId),
          parent: parentChatId ?? null,
          position: { x: pos.x, y: pos.y },
          branch_id: branchId ?? baseNode?.branch_id ?? null,
          created_at: new Date().toISOString(),
        };

        const nextEdges = [...prevEdges];

        if (parentChatId != null) {
          const already = nextEdges.some(
            (e) =>
              Number(e.source) === Number(parentChatId) &&
              Number(e.target) === Number(copyId)
          );
          if (!already) {
            nextEdges.push({
              source: Number(parentChatId),
              target: Number(copyId),
            });
          }
        }

        nextChatViews = attachParentChildren({
          ...(nextChatViews ?? {}),
          nodes: [...prevNodes, newNode],
          edges: nextEdges,
          last_updated: new Date().toISOString(),
        });

        nextBranchViews = rebuildBranchViewsFromNodes(
          nextChatViews.nodes ?? [],
          nextChatViews.edges ?? [],
          roomId,
          latestBranchViewsRef.current ?? nextBranchViews
        );

        // 이후 자식들을 위해 placeholder id → copyId 매핑
        flowIdToChatId.set(nodeKey, Number(copyId));
      } catch (e) {
        console.error("[attachChatFromExisting] error:", e);
        setErrorMsg("기존 채팅을 붙이는 중 오류가 발생했습니다.");
        setErrorOpen(true);
      }
    }

    // 5) 그룹 붙이기 (순차)
    for (const { roomId: rid, group_id } of groupAttachments) {
      try {
        await attachGroupToRoom.mutateAsync({ roomId: rid, group_id });
      } catch (e) {
        console.error("[attachGroupToRoom] error:", e);
        setErrorMsg("그룹을 붙이는 중 오류가 발생했습니다.");
        setErrorOpen(true);
      }
    }

    // 6) 최종 누적 상태를 한번에 반영 + 저장
    setChatViews(nextChatViews);
    setBranchViews(nextBranchViews);
    latestBranchViewsRef.current = nextBranchViews;
    persistBoth(nextChatViews, nextBranchViews);

    // 7) 작업 큐 비우기
    setPendingOps({
      chatCopies: [],
      groupAttachments: [],
    });
  }, [
    roomId,
    chatViews,
    branchViews,
    pendingOps,
    attachChatFromExisting,
    attachGroupToRoom,
    setErrorMsg,
    setErrorOpen,
    persistBoth,
  ]);

  const openSearchPanel = () => {
    setPanelType("search");
    setPanelOpen(true);
  };

  const handleCreateNode = useCallback(
    (newNodeId, payload, meta) => {
      // 🔥 plus 버튼으로 빈 노드만 만든 케이스
      if (meta?.source === "plus") {
        setPendingNodes((prev) => [
          ...prev,
          { nodeId: newNodeId, source: "plus" },
        ]);
        setPanelType("search");
        setPanelOpen(true);

        debugLogRoomAndGraph("plus → 빈 노드 생성", null);
        return;
      }

      // 🔥 DnD로 바로 내용이 채워진 노드가 추가된 케이스
      if (meta?.source === "dnd" && payload) {
        debugLogRoomAndGraph("DND drop → 노드 추가 직후", null);

        if (payload.type === "chat") {
          const originUid = Number(payload.id);
          enqueueChatCopy({
            originUid,
            nodeId: newNodeId,
            source: "dnd",
          });
        } else if (payload.type === "group") {
          const group_id = Number(payload.id);
          enqueueGroupAttach({
            group_id,
            nodeId: newNodeId,
            source: "dnd",
          });
        }
      }
    },
    [enqueueChatCopy, enqueueGroupAttach]
  );

  const handlePick = useCallback(
    (payload) => {
      if (pendingNodes.length > 0) {
        const last = pendingNodes[pendingNodes.length - 1];
        const rest = pendingNodes.slice(0, -1);

        // 1) 마지막 pending 노드에 내용 꽂기
        canvasRef.current?.applyContentToNode(last.nodeId, payload);

        debugLogRoomAndGraph(
          "plus/emptyClick → Modal에서 아이템 선택 후 applyContent",
          null
        );

        // 2) 저장 시 처리할 작업 enqueue
        if (payload?.type === "chat") {
          const originUid = Number(payload.id);
          enqueueChatCopy({
            originUid,
            nodeId: last.nodeId,
            source: last.source ?? "pick",
          });
        } else if (payload?.type === "group") {
          const group_id = Number(payload.id);
          enqueueGroupAttach({
            group_id,
            nodeId: last.nodeId,
            source: last.source ?? "pick",
          });
        }

        setPendingNodes(rest);
      }
      setPanelOpen(false);
    },
    [pendingNodes, enqueueChatCopy, enqueueGroupAttach]
  );

  const handleEmptyNodeClick = useCallback(
    (nodeId) => {
      if (!nodeId) return;
      setPendingNodes((prev) => [...prev, { nodeId, source: "emptyClick" }]);
      setPanelType("search");
      setPanelOpen(true);
    },
    [isGroups]
  );

  const handleClosePanel = useCallback(() => {
    setPanelOpen(false);
    setPendingNodes((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      const rest = prev.slice(0, -1);

      // plus로 만들어진 "임시 빈 노드"는 패널을 닫을 때 버림
      if (last.source === "plus" && last.nodeId) {
        canvasRef.current?.discardTempNode(last.nodeId);
      }

      return rest;
    });
  }, []);

  const showGroupButton =
    editMode && selectedCount > 1 && !hasGroupInSelection;

  /* -------------------------- 브랜치 드롭다운 -------------------------- */
  const branchItems = useMemo(() => {
    const items = [
      {
        label: "전체",
        value: "전체",
        active: activeBranchKey === "전체",
      },
    ];

    const branchesObj = branchViews?.branches ?? {};
    const keys = Object.keys(branchesObj);

    keys.forEach((key) => {
      const b = branchesObj[key];
      const label = b?.branch_name || `브랜치-${key}`;
      items.push({
        label,
        value: key, // value는 branch_id 문자열
        active: activeBranchKey === key,
      });
    });

    return items;
  }, [branchViews, activeBranchKey]);

  const handleBranchSelect = useCallback((value) => {
    setActiveBranchKey(value);
  }, []);

  const activeBranchLabel = useMemo(() => {
    if (activeBranchKey === "전체") return "전체";
    const b = branchViews?.branches?.[activeBranchKey];
    return b?.branch_name || `브랜치-${activeBranchKey}`;
  }, [activeBranchKey, branchViews]);

  /* -------------------------- 전역 SSE 리스너 -------------------------- */
  useEffect(() => {
    if (!sessionUuid) return;

    if (!preStreamSavedRef.current) {
      persistViews(chatViews);
      preStreamSavedRef.current = true;
    }

    const off = attachHandlers({
      /* ✅ CHAT_STREAM: 델타 + 그래프 조각 */
      onChatStream: (evt) => {
        try {
          const payload = evt?.data ?? evt;

          const chatId =
            payload?.chat_id ??
            payload?.id ??
            payload?.node_id ??
            payload?.data?.chat_id;
          const delta = payload?.delta ?? payload?.data?.delta;

          // ✨ 0) 첫 CHAT_STREAM 이면 모달 한 번만 자동 오픈
          if (!firstStreamOpenedRef.current) {
            firstStreamOpenedRef.current = true;
            setPanelType("chat");
            setPanelOpen(true);
          }

          // ✨ 1) 델타(문자열) 스트리밍 버퍼
          if (chatId != null && typeof delta === "string") {
            const key = String(chatId);
            const cur = streamRef.current[key] || "";
            streamRef.current[key] = cur + delta;
            setStreamTick((v) => v + 1);
          }

          // ✨ 2) 그래프 조각 스트리밍
          const incNodes = payload?.nodes ?? payload?.data?.nodes ?? [];
          const incEdges = payload?.edges ?? payload?.data?.edges ?? [];

          if (
            (!Array.isArray(incNodes) || incNodes.length === 0) &&
            (!Array.isArray(incEdges) || incEdges.length === 0)
          ) {
            return;
          }

          setChatViews((prev) => {
            if (!prev) return prev;

            const withPos = ensurePositions(prev.nodes, incNodes);
            const nextNodes = mergeNodes(prev.nodes, withPos);
            const nextEdges = uniqEdges([
              ...(prev.edges ?? []),
              ...(incEdges ?? []),
            ]);

            const next = attachParentChildren({
              ...prev,
              nodes: nextNodes,
              edges: nextEdges,
            });
            return next;
          });
        } catch (e) {
          console.error("[ROOM STREAM] merge fail:", e);
        }
      },

      // ✅ CHAT_DONE: answer / answered_at + 델타 버퍼 정리
      onChatDone: (evt) => {
        try {
          const payload = evt?.data ?? evt;
          const chatId =
            payload?.chat_id ??
            payload?.id ??
            payload?.node_id ??
            payload?.data?.chat_id;
          const answer = payload?.answer ?? payload?.data?.answer ?? undefined;
          const answered_at =
            payload?.answered_at ?? payload?.data?.answered_at ?? undefined;

          if (chatId == null) {
            return;
          }

          delete streamRef.current[String(chatId)];
          setStreamTick((v) => v + 1);

          setChatViews((prev) => {
            const { next } = updateNodeByChatId(prev, chatId, (node) => ({
              ...node,
              ...(answer !== undefined ? { answer } : {}),
              ...(answered_at !== undefined ? { answered_at } : {}),
            }));

            const enriched = attachParentChildren(next);
            persistViews(enriched);
            return enriched;
          });
        } catch (e) {
          console.error("[CHAT_DONE] update fail:", e);
        }
      },

      // ✅ CHAT_SUMMARY_KEYWORDS
      onChatSummaryKeywords: (evt) => {
        try {
          const payload = evt?.data ?? evt;
          const chatId =
            payload?.chat_id ??
            payload?.id ??
            payload?.node_id ??
            payload?.data?.chat_id;
          const updated_at =
            payload?.updated_at ?? payload?.data?.updated_at ?? undefined;
          const summary =
            payload?.summary ?? payload?.data?.summary ?? undefined;
          const keywords =
            payload?.keywords ?? payload?.data?.keywords ?? undefined;

          if (chatId == null) {
            return;
          }

          setChatViews((prev) => {
            const { next } = updateNodeByChatId(prev, chatId, (node) => ({
              ...node,
              ...(updated_at !== undefined ? { updated_at } : {}),
              ...(summary !== undefined ? { summary } : {}),
              ...(keywords !== undefined ? { keywords } : {}),
            }));

            const enriched = attachParentChildren(next);
            persistViews(enriched);
            return enriched;
          });
        } catch (e) {
          console.error("[CHAT_SUMMARY_KEYWORDS] update fail:", e);
        }
      },

      // ✅ ROOM_SHORT_SUMMARY
      onRoomShortSummary: (evt) => {
        try {
          const payload = evt?.data ?? evt;

          const room_id =
            payload?.room_id ?? payload?.data?.room_id ?? undefined;
          const branch_id_raw =
            payload?.branch_id ?? payload?.data?.branch_id ?? undefined;
          const branch_id =
            branch_id_raw != null ? Number(branch_id_raw) : null;

          const chatId =
            payload?.chat_id ??
            payload?.id ??
            payload?.node_id ??
            payload?.data?.chat_id ??
            null;

          const updated_at =
            payload?.updated_at ?? payload?.data?.updated_at ?? undefined;
          const short_summary =
            payload?.short_summary ?? payload?.data?.short_summary ?? undefined;

          const prevBV = latestBranchViewsRef.current || {
            chat_room_id: Number(room_id) || 0,
            max_branch_number: 0,
            branches: {},
            last_updated: "",
          };
          let nextBranchViews = prevBV;

          if (branch_id != null && short_summary !== undefined) {
            const prevBranches = prevBV.branches || {};
            const prevEntry = prevBranches[String(branch_id)] || {
              branch_name: "",
              included_nodes: [],
              included_edges: [],
            };

            nextBranchViews = {
              ...prevBV,
              chat_room_id: Number(room_id) || prevBV.chat_room_id || 0,
              max_branch_number: Math.max(
                prevBV.max_branch_number || 0,
                branch_id || 0
              ),
              branches: {
                ...prevBranches,
                [String(branch_id)]: {
                  ...prevEntry,
                  branch_name: short_summary,
                },
              },
              last_updated: updated_at || prevBV.last_updated,
            };

            setBranchViews(nextBranchViews);
          }

          if (chatId != null) {
            setChatViews((prev) => {
              const { next } = updateNodeByChatId(prev, chatId, (node) => ({
                ...node,
                ...(updated_at !== undefined ? { updated_at } : {}),
                ...(short_summary !== undefined ? { short_summary } : {}),
              }));

              const enriched = attachParentChildren(next);
              persistBoth(enriched, nextBranchViews);
              return enriched;
            });
          } else {
            if (nextBranchViews !== prevBV) {
              const enriched = attachParentChildren(chatViews);
              persistBoth(enriched, nextBranchViews);
            }
          }
        } catch (e) {
          console.error("[ROOM_SHORT_SUMMARY] update fail:", e);
        }
      },

      onChatError: (e) => console.error("[ROOM ERROR]", e),
    });

    return () => off && off();
  }, [
    sessionUuid,
    attachHandlers,
    persistViews,
    persistBoth,
    chatViews,
    roomId,
  ]);

  const rf = useMemo(
    () => toRF(chatViews ?? { nodes: [], edges: [] }),
    [chatViews]
  );

  const serverMessages = useMemo(() => toChatMessages(chatViews), [chatViews]);

  // ✨ 서버 메시지 + 로컬 메시지 + 스트리밍 버퍼
  const uiMessages = useMemo(() => {
    let base =
      serverMessages.length === 0
        ? [...messages]
        : [...serverMessages, ...messages];

    for (const [cid, text] of Object.entries(streamRef.current)) {
      if (!text) continue;
      base.push({
        id: `stream-${cid}`,
        role: "assistant",
        content: text,
        ts: Date.now(),
        streaming: true,
      });
    }

    return base;
  }, [serverMessages, messages, streamTick]);

  /* ---------------------- 브랜치명 입력 / 저장 콜백 ---------------------- */
  const askBranchName = useCallback((parentId, newNodeId) => {
    setBranchNameInput("");
    setBranchModalOpen(true);
    return new Promise((resolve) => {
      branchPromptResolverRef.current = resolve;
    });
  }, []);

  const handleBranchSaved = useCallback((newNodeId, parentId, name) => {
    const map = loadJSON(LS_BRANCH_BY_NODE, {});
    map[newNodeId] = name;
    saveJSON(LS_BRANCH_BY_NODE, map);
  }, []);

  /* ----------------------------- 렌더 ----------------------------- */
  return (
    <S.Page>
      <TopleftCard
        editMode={editMode}
        setEditMode={setEditMode}
        onSave={handleSave}
        onInit={handleInit}
        canReset={setCanReset}
      />

      {/* 🔥 그래프 상단 브랜치 드롭다운 */}
      <BranchDropdown
        label={activeBranchLabel}
        items={branchItems}
        open={branchOpen}
        setOpen={setBranchOpen}
        onSelect={handleBranchSelect}
      />

      {showGroupButton && (
        <S.TopCenterActionBar>
          <S.GroupChip onClick={openGroupModal}>＋ 그룹 생성</S.GroupChip>
        </S.TopCenterActionBar>
      )}

      {/* 🔥 ModalShell에 브랜치 상태/목록 주입 */}
      <ModalShell
        open={panelOpen}
        onOpen={() => setPanelOpen(true)}
        onClose={handleClosePanel}
        type={panelType}
        setType={setPanelType}
        title={activeBranchLabel}
        messages={uiMessages}
        input={input}
        onInputChange={setInput}
        onSend={handleSend}
        peek={false}
        onPick={handlePick}
        // 🔽 브랜치 동기화용 추가
        branchItems={branchItems}
        activeBranchKey={activeBranchKey}
        onBranchSelect={handleBranchSelect}
      />

      <InputDialog
        open={groupModalOpen}
        title="그룹명 입력"
        placeholder="예: 검색어 정리, Q&A 묶음…"
        value={groupName}
        setValue={setGroupName}
        onCancel={() => setGroupModalOpen(false)}
        onConfirm={confirmGroupName}
      />

      <InputDialog
        open={branchModalOpen}
        title="브랜치명 입력"
        placeholder="예: 예시 분기, 실패 케이스, 심화…"
        value={branchNameInput}
        setValue={setBranchNameInput}
        onCancel={cancelBranchModal}
        onConfirm={confirmBranchModal}
      />

      <ErrorDialog
        open={errorOpen}
        title="알림"
        message={errorMsg}
        onClose={() => setErrorOpen(false)}
      />


      <FlowCanvas
        ref={canvasRef}
        editMode={editMode}
        activeBranch={activeBranchKey}
        nodes={rf.nodes}
        edges={rf.edges}
        onCanResetChange={setCanReset}
        onSelectionCountChange={(count, containsGroup, selNodes) => {
          setSelectedCount(count);
          setHasGroupInSelection(!!containsGroup);
          setSelectedNodesForGroup(selNodes ?? []);
        }}
        onNodeClickInViewMode={(nodeId, meta) => {
          if (meta?.empty) {
            handleEmptyNodeClick(nodeId);
            return;
          }
          const isGroupsView = pathname.startsWith("/groups");
          if (isGroupsView) {
            setPanelType("search");
            setPanelOpen(true);
          } else {
            if (nodeId) setEditingNodeId(nodeId);
            setPanelType("chat");
            setPanelOpen(true);
          }
        }}
        onEditNodeClick={(nodeId, meta) => {
          if (meta?.empty && nodeId) {
            handleEmptyNodeClick(nodeId);
            return;
          }
        }}
        onCreateNode={handleCreateNode}
        askBranchName={askBranchName}
        onBranchSaved={handleBranchSaved}
        onError={handleCoreError}
        roomId={roomId}
        roomData={{
          ...(apiRoomData ?? {}),
          ...(effectiveRoomData ?? {}),
          ...chatViews,
        }}

        roomLoading={roomLoading}
        roomError={roomError}
      />
    </S.Page>
  );

  /* -------------------------- 그룹 모달 핸들러 -------------------------- */

  function openGroupModal() {
    setGroupName("");
    setGroupModalOpen(true);
  }

  function confirmGroupName() {
    const name = groupName.trim();
    if (!name) return;

    const chatIds = (selectedNodesForGroup ?? [])
      .map((n) => {
        const raw = n?.data?.raw || {};
        return raw.chat_id ?? raw.id ?? n.chat_id ?? n.id;
      })
      .filter((v) => v != null)
      .map((v) => Number(v))
      .filter((v) => !Number.isNaN(v));

    if (chatIds.length === 0) {
      setGroupModalOpen(false);
      return;
    }

    createGroup.mutate(
      {
        nodes: chatIds,
        name,
      },
      {
        onSuccess: () => {
          setGroupModalOpen(false);
        },
        onError: () => {
          setErrorMsg("그룹 생성 중 오류가 발생했습니다.");
          setErrorOpen(true);
        },
      }
    );
  }

  function cancelBranchModal() {
    setBranchModalOpen(false);
    if (branchPromptResolverRef.current) {
      branchPromptResolverRef.current(null);
      branchPromptResolverRef.current = null;
    }
  }

  function confirmBranchModal() {
    const name = branchNameInput.trim();
    if (!name) return;
    setBranchModalOpen(false);
    if (branchPromptResolverRef.current) {
      branchPromptResolverRef.current(name);
      branchPromptResolverRef.current = null;
    }
  }

  /* -------------------------- JSON 디버그 함수 -------------------------- */
  function debugLogRoomAndGraph(
    reason,
    overrides /* { chatInfoOverride?, branchViewOverride? } | null */
  ) {
    if (!DEBUG_FLOW) return;
    if (!canvasRef.current?.getSnapshot) return;

    const graphSnap = canvasRef.current.getSnapshot();

    const chatInfo =
      overrides?.chatInfoOverride ??
      ({
        chat_room_id: Number(roomId),
        ...(chatViews ?? {}),
      } ||
        null);

    const branchView =
      overrides?.branchViewOverride ?? latestBranchViewsRef.current ?? null;

    const roomShape = {
      roomUid: Number(roomId),
      chatInfo,
      branchView,
    };

    console.log(`\n======= [FLOW_DEBUG] ${reason} =======`);
    console.log("[FLOW_DEBUG] ReactFlow snapshot (nodes/edges):", graphSnap);
    console.log("[FLOW_DEBUG] room payload (fetchedRoom shape):", roomShape);
    console.log("===================================\n");
  }
}
