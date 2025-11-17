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
import { useCreateChat } from "@/hooks/useRoomChats";
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
  deriveViews,
} from "./-chatFlow.utils";
import {
  collectAncestorChatIds,
  orderedNodesByGraph,
  attachParentChildren,
  rebuildBranchViewsFromNodes,
  rebuildFromSnapshot,
  applyLocalBranchNames,
} from "./-chatFlow.graph";
/* ======================================================================= */
/* 🔧 디버그 플래그: 필요할 때만 true 로 바꿔서 사용 */
const DEBUG_FLOW = true;

export default function ChatFlowPage() {
  /* ✅ URL 파라미터 (/chatrooms/$roomId) */
  const { nodeId } = useParams({ strict: false });
  const [roomId] = useState(nodeId);

  /* ✅ 라우터 state (NewChat → navigate 시 넘긴 roomInit) */
  const routeState = useRouterState();
  const roomInit = routeState?.location?.state?.roomInit;

  // 선택된 노드의 chat_id (뷰 모드 포커싱용)
  const [focusedChatId, setFocusedChatId] = useState(null);

  /* ✅ 서버 최신 데이터 */
  const {
    data: fetchedRoom,
    isLoading: roomLoading,
    error: roomError,
  } = useRoom(roomId);
  const createChat = useCreateChat();
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

  const [baseline, setBaseline] = useState(() => ({
    chatViews: attachParentChildren(initialViews.chatViews),
    branchViews: initialViews.branchViews,
  }));

  // 🔥 chatViews 최신값을 참조하기 위한 ref (snapshot 저장/부모 계산용)
  const chatViewsRef = useRef(chatViews);
  useEffect(() => {
    chatViewsRef.current = chatViews;
  }, [chatViews]);

  const latestBranchViewsRef = useRef(branchViews);
  useEffect(() => {
    latestBranchViewsRef.current = branchViews;
  }, [branchViews]);

  useEffect(() => {
    const next = deriveViews(effectiveRoomData);
    const nextChat = attachParentChildren(next.chatViews);

    setChatViews(nextChat);
    setBranchViews(next.branchViews);

    // ✅ 링크에 들어왔을 때 상태를 baseline으로 기록
    setBaseline({
      chatViews: nextChat,
      branchViews: next.branchViews,
    });
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

      const payload = {
        roomId: Number(roomId),
        chatInfo: normalized,
        branchView: latestBranchViewsRef.current,
      };

      console.log("==== [SAVE_DEBUG] persistViews payload (object) ====");
      console.log(payload);
      console.log(
        "==== [SAVE_DEBUG] persistViews payload (JSON) ====\n",
        JSON.stringify(payload, null, 2)
      );

      // ✅ 실제 저장 API 호출
      saveRoomData.mutate(
        {
          roomId: Number(roomId),
          chatInfo: JSON.stringify(normalized),
          branchView: JSON.stringify(latestBranchViewsRef.current),
        },
        {
          onError: (err) => {
            console.error("[persistViews] saveRoomData error:", err);
          },
        }
      );
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

      const payload = {
        roomId: Number(roomId),
        chatInfo: normalized,
        branchView: nextBranchViews,
      };

      console.log("==== [SAVE_DEBUG] persistBoth payload (object) ====");
      console.log(payload);
      console.log(
        "==== [SAVE_DEBUG] persistBoth payload (JSON) ====\n",
        JSON.stringify(payload, null, 2)
      );

      // ✅ 실제 저장 API 호출
      saveRoomData.mutate(
        {
          roomId: Number(roomId),
          chatInfo: JSON.stringify(normalized),
          branchView: JSON.stringify(nextBranchViews),
        },
        {
          onError: (err) => {
            console.error("[persistBoth] saveRoomData error:", err);
          },
        }
      );
    },
    [roomId, saveRoomData]
  );

  /* 🔥 새로 추가: 검증 없이 조용히 스냅샷만 저장하는 함수
     - 채팅 전송(handleSend)에서만 사용
     - 비어 있는 노드가 있어도 validateForSave를 호출하지 않음 */
  const canvasRef = useRef(null);

  const snapshotAndPersistSilently = useCallback(() => {
    if (!canvasRef.current?.getSnapshot) return;

    const snapshot = canvasRef.current.getSnapshot?.() || {
      nodes: [],
      edges: [],
    };

    const { chatInfo, branchView } = rebuildFromSnapshot(
      chatViewsRef.current,
      latestBranchViewsRef.current,
      snapshot,
      roomId
    );

    setChatViews(chatInfo);
    setBranchViews(branchView);
    latestBranchViewsRef.current = branchView;

    setBaseline({
      chatViews: chatInfo,
      branchViews: branchView,
    });

    persistBoth(chatInfo, branchView);
  }, [roomId, persistBoth]);

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

  const createGroup = useCreateGroup();

  const attachChatFromExisting = useAttachChatFromExisting();
  const attachGroupToRoom = useAttachGroup();

  /* --------------------------- 에러 핸들러 --------------------------- */
  const handleCoreError = useCallback(({ message }) => {
    setErrorMsg(message || "오류가 발생했습니다.");
    setErrorOpen(true);
  }, []);

  /* ------------------------- FlowCanvas 조작 ------------------------- */
  const handleInit = () => {
    if (!baseline) return;

    setChatViews(baseline.chatViews);
    setBranchViews(baseline.branchViews);
    latestBranchViewsRef.current = baseline.branchViews;

    // 필요하다면 여기서도 한번 저장해도 됨
    // persistBoth(baseline.chatViews, baseline.branchViews);
  };

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

    // 1-2) RF 부모/자식 맵 (childRFId -> parentRFId)
    const rfParentMap = new Map();
    (snapshot.edges ?? []).forEach((e) => {
      if (!e) return;
      const child = String(e.target);
      const parent = String(e.source);
      rfParentMap.set(child, parent);
    });

    // ✅ 항상 snapshot 기준으로 한 번 재구성해서
    //    삭제/이동/연결 상태를 base로 만든다
    const { chatInfo: baseChatInfo, branchView: baseBranchView } =
      rebuildFromSnapshot(chatViews, branchViews, snapshot, roomId);

    // 1-3) RF id → 도메인 chat_id 맵 (기존 노드용)
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

      setBaseline({
        chatViews: baseChatInfo,
        branchViews: baseBranchView,
      });
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

    // 5) 그룹 붙이기 (순차) + 도메인 GROUP 노드 생성
    for (const { roomId: rid, group_id, nodeId } of groupAttachments) {
      try {
        const response = await attachGroupToRoom.mutateAsync({
          roomId: rid,
          group_id,
        });
        const res = response.data.data;
        console.log("[attachGroupToRoom] response:", res);

        // ⚠️ 응답 구조는 추측입니다.
        const apiData = res?.data ?? res;
        const groupNodeId =
          apiData?.newChatId ??
          apiData?.chat_id ??
          apiData?.data?.node_id ??
          apiData?.data?.chat_id ??
          null;

        if (!groupNodeId) {
          console.warn(
            "[attachGroupToRoom] 응답에 node_id/chat_id 없음, 도메인 노드 생성 생략"
          );
          continue;
        }

        const rfId = String(nodeId);

        // RF 스냅샷에서 이 그룹 노드의 위치
        const pos = posMap.get(rfId) || { x: 0, y: 0 };

        // RF 스냅샷에서 이 Flow 노드 자체 (data 복사용)
        const snapNodeForGroup = snapNodes.find((n) => String(n.id) === rfId);

        const prevNodes = nextChatViews?.nodes ?? [];
        const prevEdges = nextChatViews?.edges ?? [];

        // 부모 edge (부모 → 그룹)
        const parentEdge = (snapshot.edges ?? []).find(
          (e) => String(e.target) === rfId
        );

        let parentChatId = null;
        if (parentEdge) {
          const parentRFId = String(parentEdge.source);
          parentChatId =
            flowIdToChatId.get(parentRFId) ??
            (!Number.isNaN(Number(parentRFId)) ? Number(parentRFId) : null);
        }

        // 🔍 형제 edge들 (부모가 이미 다른 자식들을 갖고 있는지 확인)
        const siblingEdges = parentEdge
          ? (snapshot.edges ?? []).filter(
              (e) => String(e.source) === String(parentEdge.source)
            )
          : [];

        const hasOtherChildren =
          parentEdge && siblingEdges.some((e) => String(e.target) !== rfId);

        // branch_id 결정: 스냅샷 data → 없으면 부모 branch_id 상속
        const baseBranchId =
          snapNodeForGroup?.data?.branch_id ??
          snapNodeForGroup?.data?.branchId ??
          (parentChatId != null
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

        // 🔥 도메인 GROUP 노드 생성
        const groupNode = {
          ...(snapNodeForGroup?.data?.raw ?? snapNodeForGroup?.data ?? {}),
          chat_id: Number(groupNodeId),
          type: "GROUP",
          group_id: Number(group_id),
          parent: parentChatId ?? null,
          position: { x: pos.x, y: pos.y },
          branch_id: branchId ?? baseBranchId ?? null,
          created_at: new Date().toISOString(),
        };

        const nextEdges = [...prevEdges];

        // 부모 → 그룹 edge
        if (parentChatId != null) {
          const already = nextEdges.some(
            (e) =>
              Number(e.source) === Number(parentChatId) &&
              Number(e.target) === Number(groupNodeId)
          );
          if (!already) {
            nextEdges.push({
              source: Number(parentChatId),
              target: Number(groupNodeId),
            });
          }
        }

        // 누적 상태에 GROUP 노드 반영
        nextChatViews = attachParentChildren({
          ...(nextChatViews ?? {}),
          nodes: [...prevNodes, groupNode],
          edges: nextEdges,
          last_updated: new Date().toISOString(),
        });

        // GROUP 노드까지 포함해서 branchViews 재계산
        nextBranchViews = rebuildBranchViewsFromNodes(
          nextChatViews.nodes ?? [],
          nextChatViews.edges ?? [],
          roomId,
          latestBranchViewsRef.current ?? nextBranchViews
        );

        // placeholder RF id → 실제 chat_id 매핑
        flowIdToChatId.set(rfId, Number(groupNodeId));
      } catch (e) {
        console.error("[attachGroupToRoom] error:", e);
        setErrorMsg("그룹을 붙이는 중 오류가 발생했습니다.");
        setErrorOpen(true);
      }
    }

    // 5.5) RF 부모/자식 맵을 기준으로 도메인 엣지 보정
    if (nextChatViews) {
      const currentEdges = nextChatViews.edges ?? [];
      let finalEdges = [...currentEdges];

      rfParentMap.forEach((parentRfId, childRfId) => {
        const parentChatId = flowIdToChatId.get(String(parentRfId));
        const childChatId = flowIdToChatId.get(String(childRfId));

        // 둘 중 하나라도 매핑이 없으면 (ex. 아직 서버에 없는 빈 노드) 스킵
        if (!parentChatId || !childChatId) return;

        const already = finalEdges.some(
          (e) =>
            Number(e.source) === Number(parentChatId) &&
            Number(e.target) === Number(childChatId)
        );
        if (!already) {
          finalEdges.push({
            source: Number(parentChatId),
            target: Number(childChatId),
          });
        }
      });

      nextChatViews = attachParentChildren({
        ...(nextChatViews ?? {}),
        edges: finalEdges,
        last_updated: new Date().toISOString(),
      });

      nextBranchViews = rebuildBranchViewsFromNodes(
        nextChatViews.nodes ?? [],
        nextChatViews.edges ?? [],
        roomId,
        latestBranchViewsRef.current ?? nextBranchViews
      );
    }

    // 🔥 브랜치명 로컬 캐시 반영
    nextBranchViews = applyLocalBranchNames(
      nextChatViews,
      nextBranchViews,
      flowIdToChatId
    );

    // 6) 최종 누적 상태를 한번에 반영 + 저장
    setChatViews(nextChatViews);
    setBranchViews(nextBranchViews);
    latestBranchViewsRef.current = nextBranchViews;

    setBaseline({
      chatViews: nextChatViews,
      branchViews: nextBranchViews,
    });
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

  /* ----------------------------- 채팅 전송 ----------------------------- */
  const handleSend = useCallback(() => {
    const t = input.trim();
    if (!t) return;

    // 0. 편집 중인 노드 기준 정보 준비
    const flowNodeId = editingNodeId; // ReactFlow node.id (지금 ModalShell이 붙어있는 노드)
    let parentChatIds = [];
    let branchId = null;

    // 1. 채팅 전용: 검증 없이 조용히 스냅샷 기반 graph 저장
    try {
      snapshotAndPersistSilently();
    } catch (e) {
      console.error("[handleSend] snapshotAndPersistSilently 실패:", e);
    }

    // 2. 저장 이후의 최신 chatViews 기준으로 부모 chain 계산
    const currentViews = chatViewsRef.current;

    if (flowNodeId && currentViews) {
      const nodes = currentViews.nodes ?? [];

      const target = nodes.find(
        (n) => String(n.chat_id ?? n.id ?? n.node_id) === String(flowNodeId)
      );

      if (target) {
        const cidRaw = target.chat_id ?? target.id ?? target.node_id;
        const cid =
          cidRaw !== undefined && cidRaw !== null ? Number(cidRaw) : null;

        if (cid !== null && !Number.isNaN(cid)) {
          parentChatIds = collectAncestorChatIds(currentViews, cid, 5);
        }

        const bRaw = target.branch_id ?? target.branchId ?? null;
        if (bRaw != null && !Number.isNaN(Number(bRaw))) {
          branchId = Number(bRaw);
        }
      }
    }

    // 3. UI 상에는 기존처럼 바로 유저 메시지 출력
    addUser(t);
    setInput("");

    // 4. 백엔드에 새 채팅 생성 요청
    //    (모델명 / useLlm 값은 백엔드 설정에 따라 조정 필요 → 추측입니다.)
    try {
      createChat.mutate({
        roomId: Number(roomId),
        question: t,
        parents: parentChatIds, // 🔥 조상 최대 5개
        branch_id: branchId, // 현재 노드가 속한 브랜치
        model: "gpt-4o-mini", // 추측입니다.
        useLlm: false,
      });
    } catch (e) {
      console.error("[handleSend] createChat 호출 실패:", e);
    }

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
  }, [
    input,
    addUser,
    editingNodeId,
    snapshotAndPersistSilently,
    roomId,
    createChat,
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

  const handleEmptyNodeClick = useCallback((nodeId) => {
    if (!nodeId) return;
    setPendingNodes((prev) => [...prev, { nodeId, source: "emptyClick" }]);
    setPanelType("search");
    setPanelOpen(true);
  }, []);

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

  // ✅ 편집모드 OFF 일 때 노드 클릭 → 해당 브랜치 선택 + 채팅 패널 열기
  const handleNodeClickInViewMode = useCallback(
    (nodeId, meta) => {
      if (!nodeId) return;

      // 1) 빈 노드이면 지금처럼 검색 패널 열기
      if (meta?.empty) {
        handleEmptyNodeClick(nodeId);
        return;
      }

      const allNodes = chatViews?.nodes ?? [];

      // ReactFlow node.id ↔ 도메인 chat_id 매핑
      const target = allNodes.find(
        (n) => String(n.chat_id ?? n.id ?? n.node_id) === String(nodeId)
      );

      // 못 찾으면 기존 동작 유지 (패널만 열기)
      if (!target) {
        const isGroupsView = pathname.startsWith("/groups");
        if (isGroupsView) {
          setPanelType("search");
        } else {
          setEditingNodeId(nodeId);
          setPanelType("chat");
        }
        setPanelOpen(true);
        return;
      }

      // 🔥 이 노드의 도메인 chat_id 추출해서 포커스 상태로 저장
      const cidRaw = target.chat_id ?? target.id ?? target.node_id;
      const cid =
        cidRaw !== undefined && cidRaw !== null ? Number(cidRaw) : null;
      if (cid !== null && !Number.isNaN(cid)) {
        setFocusedChatId(cid);
      }

      // 2) 이 노드가 속한 브랜치 찾기
      let nextBranchKey = "전체";

      const rawBranch = target.branch_id ?? target.branchId ?? null;
      if (rawBranch != null && !Number.isNaN(Number(rawBranch))) {
        nextBranchKey = String(Number(rawBranch));
      } else {
        const branchesObj = branchViews?.branches ?? {};
        const nodeCid = Number(target.chat_id ?? target.id ?? target.node_id);

        for (const [key, b] of Object.entries(branchesObj)) {
          const ids = (b.included_nodes ?? [])
            .map((id) => Number(id))
            .filter((v) => !Number.isNaN(v));

          if (ids.includes(nodeCid)) {
            nextBranchKey = key;
            break;
          }
        }
      }

      // 🔥 ModalShell이 열려 있을 때는 브랜치 전환 안 함
      if (!panelOpen && nextBranchKey !== activeBranchKey) {
        setActiveBranchKey(nextBranchKey);
      }

      // 4) 채팅/검색 패널 열기
      const isGroupsView = pathname.startsWith("/groups");
      if (isGroupsView) {
        setPanelType("search");
      } else {
        setEditingNodeId(nodeId);
        setPanelType("chat");
      }
      setPanelOpen(true);
    },
    [
      chatViews,
      branchViews,
      pathname,
      handleEmptyNodeClick,
      activeBranchKey,
      panelOpen,
    ]
  );

  const showGroupButton = editMode && selectedCount > 1 && !hasGroupInSelection;

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

  const firstBranchKeyForWhole = useMemo(() => {
    // "전체" 말고, 실제 브랜치 중 첫 번째 아이템
    const firstBranchItem = (branchItems || []).find(
      (it) => it.value !== "전체"
    );
    return firstBranchItem?.value ?? null;
  }, [branchItems]);

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
      onChatStream: (payload) => {
        try {
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
      onChatDone: (payload) => {
        try {
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
      onChatSummaryKeywords: (payload) => {
        try {
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
      onRoomShortSummary: (payload) => {
        try {
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

  const filteredGraph = useMemo(() => {
    const base = chatViews ?? { nodes: [], edges: [] };

    // 1) 전체 보기면 그대로
    if (activeBranchKey === "전체") return base;

    const branchInfo = branchViews?.branches?.[activeBranchKey];
    if (!branchInfo) return base;

    const nodes = base.nodes ?? [];
    const edges = base.edges ?? [];

    // chat_id 기준으로 노드 맵
    const nodeById = new Map(
      nodes.map((n) => [Number(n.chat_id ?? n.id ?? n.node_id), n])
    );

    // 2) 이 브랜치에 포함된 노드들 집합
    const branchSet = new Set(
      (branchInfo.included_nodes ?? [])
        .map((id) => Number(id))
        .filter((v) => !Number.isNaN(v))
    );

    // 3) 브랜치 노드들 + 루트까지의 부모 체인 전부 모으기
    const visibleSet = new Set();

    for (const id of branchSet) {
      let cur = id;
      while (cur != null && !Number.isNaN(cur) && !visibleSet.has(cur)) {
        visibleSet.add(cur);
        const node = nodeById.get(cur);
        if (!node || node.parent == null) break;
        cur = Number(node.parent);
      }
    }

    // 4) visibleSet에 포함된 노드만 남기기
    const filteredNodes = nodes.filter((n) => {
      const rawId = n.chat_id ?? n.id ?? n.node_id;
      const cid = rawId != null ? Number(rawId) : NaN;
      return !Number.isNaN(cid) && visibleSet.has(cid);
    });

    // 5) visibleSet에 양 끝이 모두 있는 엣지만 남기기
    const filteredEdges = (edges ?? []).filter((e) => {
      const s = Number(e.source);
      const t = Number(e.target);
      if (Number.isNaN(s) || Number.isNaN(t)) return false;
      return visibleSet.has(s) && visibleSet.has(t);
    });

    return {
      ...base,
      nodes: filteredNodes,
      edges: filteredEdges,
    };
  }, [chatViews, branchViews, activeBranchKey]);

  // 🔥 ChatContent 전용 그래프: "전체"일 땐 첫 번째 브랜치만 보여주기
  const messageGraph = useMemo(() => {
    // 전체가 아니면, 그냥 filteredGraph(현재 브랜치) 사용
    if (activeBranchKey !== "전체") return filteredGraph;

    // 브랜치가 하나도 없으면 전체 그래프 그대로 사용
    if (!firstBranchKeyForWhole) return filteredGraph;

    const base = chatViews ?? { nodes: [], edges: [] };
    const branchInfo = branchViews?.branches?.[firstBranchKeyForWhole];
    if (!branchInfo) return filteredGraph;

    const nodes = base.nodes ?? [];
    const edges = base.edges ?? [];

    const nodeById = new Map(
      nodes.map((n) => [Number(n.chat_id ?? n.id ?? n.node_id), n])
    );

    // 첫 번째 브랜치에 포함된 노드 집합
    const branchSet = new Set(
      (branchInfo.included_nodes ?? [])
        .map((id) => Number(id))
        .filter((v) => !Number.isNaN(v))
    );

    const visibleSet = new Set();

    // 브랜치 노드 + 루트까지 부모 체인 포함
    for (const id of branchSet) {
      let cur = id;
      while (cur != null && !Number.isNaN(cur) && !visibleSet.has(cur)) {
        visibleSet.add(cur);
        const node = nodeById.get(cur);
        if (!node || node.parent == null) break;
        cur = Number(node.parent);
      }
    }

    const filteredNodes = nodes.filter((n) => {
      const rawId = n.chat_id ?? n.id ?? n.node_id;
      const cid = rawId != null ? Number(rawId) : NaN;
      return !Number.isNaN(cid) && visibleSet.has(cid);
    });

    const filteredEdges = (edges ?? []).filter((e) => {
      const s = Number(e.source);
      const t = Number(e.target);
      if (Number.isNaN(s) || Number.isNaN(t)) return false;
      return visibleSet.has(s) && visibleSet.has(t);
    });

    return {
      ...base,
      nodes: filteredNodes,
      edges: filteredEdges,
    };
  }, [
    filteredGraph,
    chatViews,
    branchViews,
    activeBranchKey,
    firstBranchKeyForWhole,
  ]);

  const handleSelectionCountChange = useCallback(
    (count, containsGroup, selNodes) => {
      setSelectedCount(count);
      setHasGroupInSelection(!!containsGroup);
      setSelectedNodesForGroup(selNodes ?? []);
    },
    []
  );

  // 🔥 이 브랜치에서 "보이는 chat_id" 집합
  const visibleChatIdSet = useMemo(() => {
    const nodes = messageGraph?.nodes ?? [];
    const ids = nodes
      .map((n) => Number(n.chat_id ?? n.id ?? n.node_id))
      .filter((v) => !Number.isNaN(v));
    return new Set(ids);
  }, [messageGraph]);

  const rf = useMemo(
    () => toRF(filteredGraph ?? { nodes: [], edges: [] }),
    [filteredGraph]
  );

  // 🔥 ReactFlow에 보이는 그래프(filteredGraph) 기준으로만 메시지 생성
  const serverMessages = useMemo(() => {
    const ordered = orderedNodesByGraph(messageGraph);
    const result = [];

    ordered.forEach((n) => {
      const raw = n || {};
      const data = raw.data || {};
      const cidRaw = raw.chat_id ?? raw.id ?? raw.node_id;
      const cid = cidRaw != null ? Number(cidRaw) : null;

      const nodeType = raw.type ?? data.type ?? null;

      // =========================
      // 1) GROUP 노드 처리
      // =========================
      if (nodeType === "GROUP") {
        const name =
          raw.group_name ||
          data.group_name ||
          raw.label ||
          data.label ||
          `그룹 ${raw.group_id ?? cid ?? ""}`;

        result.push({
          id: `group-${cid ?? Math.random()}`,
          role: "group",
          content: `${name} 추가`,
          ts:
            raw.updated_at ||
            data.updated_at ||
            raw.created_at ||
            data.created_at ||
            0,
          // 🔥 이 그룹이 어떤 노드인지 필요하면 같이 내려줄 수 있음
          chatId: cid,
        });
        return;
      }

      // =========================
      // 2) 일반 CHAT 노드 처리
      // =========================
      const question =
        raw.question ?? data.question ?? raw.label ?? data.label ?? "";

      const answer =
        raw.answer ??
        raw.short_summary ??
        raw.summary ??
        data.answer ??
        data.short_summary ??
        data.summary ??
        "";

      const createdTs = raw.created_at || data.created_at || 0;
      const updatedTs =
        raw.answered_at ||
        raw.updated_at ||
        data.answered_at ||
        data.updated_at ||
        createdTs;

      if (question) {
        result.push({
          id: `q-${cid ?? Math.random()}`,
          role: "user",
          content: question,
          ts: createdTs,
          // 🔥 이 말풍선이 어떤 chat 노드의 질문인지
          chatId: cid,
        });
      }

      if (answer) {
        result.push({
          id: `a-${cid ?? Math.random()}`,
          role: "assistant",
          content: answer,
          ts: updatedTs,
          // 🔥 이 말풍선이 어떤 chat 노드의 답변인지
          chatId: cid,
        });
      }
    });

    return result;
  }, [messageGraph]);

  // ✨ 서버 메시지 + 로컬 메시지 + 스트리밍 버퍼
  const uiMessages = useMemo(() => {
    let base =
      serverMessages.length === 0
        ? [...messages]
        : [...serverMessages, ...messages];

    for (const [cid, text] of Object.entries(streamRef.current)) {
      if (!text) continue;

      const numId = Number(cid);
      // 🔥 현재 브랜치에 보이지 않는 노드(chat_id)는 ChatContent에서 제외
      if (!Number.isNaN(numId) && !visibleChatIdSet.has(numId)) continue;

      base.push({
        id: `stream-${cid}`,
        role: "assistant",
        content: text,
        ts: Date.now(),
        streaming: true,
      });
    }

    return base;
  }, [serverMessages, messages, streamTick, visibleChatIdSet]);

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
        canReset={canReset}
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
        // 🔥 새로 추가: 어떤 노드를 가운데로 스크롤할지
        focusChatId={focusedChatId}
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
        onSelectionCountChange={handleSelectionCountChange}
        onNodeClickInViewMode={handleNodeClickInViewMode}
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
    console.log("=====================================\n");
  }
}
