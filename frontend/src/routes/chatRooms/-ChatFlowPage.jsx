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
  orderedNodesByGraph,
  attachParentChildren,
  rebuildBranchViewsFromNodes,
  rebuildFromSnapshot,
  applyLocalBranchNames,
} from "./-chatFlow.graph";

/* ======================================================================= */
/* 🔧 디버그 플래그 */
const DEBUG_FLOW = true;

/* ======================================================================= */
/* 🔧 parent 체인 수집 (chat_id 기준)                                       */
function collectAncestorsFromGraph(nodes, startChatId, limit = 5) {
  if (!startChatId) return [];

  const parentMap = {};
  for (const n of nodes ?? []) {
    const cidRaw = n?.chat_id ?? n?.id ?? n?.node_id;
    const cid = cidRaw !== undefined && cidRaw !== null ? Number(cidRaw) : null;
    if (cid === null || Number.isNaN(cid)) continue;

    const parentRaw = n?.parent ?? n?.parent_chat_id ?? null;
    const parent =
      parentRaw !== undefined && parentRaw !== null ? Number(parentRaw) : null;

    if (parent === null || Number.isNaN(parent)) continue;
    parentMap[cid] = parent;
  }

  const result = [];
  let cur = Number(startChatId);

  while (result.length < limit) {
    const parent = parentMap[cur];
    if (!parent) break;
    result.push(parent);
    cur = parent;
  }

  return result;
}

/* ======================================================================= */
/* 컴포넌트 시작                                                             */
/* ======================================================================= */
export default function ChatFlowPage() {
  /* ✅ URL 파라미터 (/chatrooms/$roomId) */
  const { nodeId: roomId } = useParams({ strict: false });
  const {
    data: fetchedRoom,
    isLoading: roomLoading,
    error: roomError,
  } = useRoom(roomId);
  /* ✅ 라우터 state (NewChat → navigate 시 넘긴 roomInit) */
  const routeState = useRouterState();
  const locationState = routeState?.location?.state ?? {};
  const roomInit = locationState.roomInit;
  const apiRoomData = fetchedRoom?.data ?? fetchedRoom ?? null;
  const initialModelCode =
    locationState.modelCode ?? roomInit?.model ?? apiRoomData?.model ?? "";
  const routeMode = locationState.mode ?? "existing-room";
  const [ignoreRoomInit, setIgnoreRoomInit] = useState(false);
  const startBranchKeyFromRoute = locationState.startBranchKey ?? "전체";

  // 선택된 노드의 chat_id (뷰 모드 포커싱용)
  const [focusedChatId, setFocusedChatId] = useState(null);
  const [previewChatIds, setPreviewChatIds] = useState(null);
  const attachChatFromExisting = useAttachChatFromExisting();
  const attachGroupToRoom = useAttachGroup();

  const [input, setInput] = useState("");
  const [editingNodeId, setEditingNodeId] = useState(null);

  const [branchOpen, setBranchOpen] = useState(false);
  // 드롭다운에서 선택된 항목 (value는 "전체" 또는 branch_id 문자열)
  const [activeBranchKey, setActiveBranchKey] = useState(
    startBranchKeyFromRoute
  );

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

  const [modelCode, setModelCode] = useState(initialModelCode);
  /* ✅ 서버 최신 데이터 */

  const createChat = useCreateChat();

  const effectiveRoomData =
    ignoreRoomInit || !roomInit ? apiRoomData : roomInit;

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

  /* =======================================================================
   * ✅ 서버에서 새 chat 노드가 만들어졌을 때 (createChat onSuccess, SSE 등)
   *    도메인 그래프(chatViews)에 반영하는 공통 함수
   * ======================================================================= */
  function upsertCreatedChatNode({
    room_id,
    node_id,
    branch_id,
    question,
    parents,
    created_at,
  }) {
    if (!node_id) return;

    setChatViews((prev) => {
      const base = prev ?? { nodes: [], edges: [] };
      const prevNodes = base.nodes ?? [];
      const prevEdges = base.edges ?? [];

      const parentId =
        Array.isArray(parents) && parents.length > 0
          ? Number(parents[0]) // ✅ parent는 “직접 부모 하나만”
          : null;

      const nodeIdNum = Number(node_id);

      // 0) 이미 같은 chat_id 있으면 중복 이벤트 → 무시
      if (
        prevNodes.some(
          (n) => Number(n.chat_id ?? n.id ?? n.node_id) === nodeIdNum
        )
      ) {
        return prev;
      }

      // 1) handleSend에서 만들어 둔 placeholder 찾기
      const placeholderIndex = prevNodes.findIndex((n) => {
        const rawId = n.chat_id ?? n.id ?? n.node_id;
        const nodeParent = n.parent ?? n.parent_chat_id ?? null;
        const nodeBranch = n.branch_id ?? n.branchId ?? null;

        const sameParent =
          parentId == null
            ? nodeParent == null
            : Number(nodeParent) === Number(parentId);

        const hasRealChatId =
          n.chat_id != null && !Number.isNaN(Number(n.chat_id));
        const isPending = !!n.pending;
        const isTemp = isPending && !hasRealChatId; // 🔥 임시 노드 판정
        const emptyQuestion = !n.question && !(n.data && n.data.question);

        return sameParent && (isTemp || emptyQuestion);
      });

      let nextNodes;

      if (placeholderIndex >= 0) {
        // 2-A) placeholder 승격
        const old = prevNodes[placeholderIndex];
        const parentNode =
          parentId != null
            ? prevNodes.find(
                (n) =>
                  Number(n.chat_id ?? n.id ?? n.node_id) === Number(parentId)
              )
            : null;

        const basePos = old.position ?? parentNode?.position ?? { x: 0, y: 0 };
        nextNodes = [
          ...prevNodes.slice(0, placeholderIndex),
          {
            ...old,
            chat_id: nodeIdNum, // 🔥 여기에서 chat_id 확정
            parent: parentId,
            parents: parents ?? [],
            branch_id: branch_id ?? old.branch_id ?? null,
            question: question || old.question || "",
            created_at:
              created_at ?? old.created_at ?? new Date().toISOString(),
            pending: true, // 답변이 아직 안 왔으니 true 유지
            type: old.type ?? "CHAT",
            position: basePos,
          },
          ...prevNodes.slice(placeholderIndex + 1),
        ];
      } else {
        // 2-B) placeholder 없으면 새 노드 생성
        const parentNode =
          parentId != null
            ? prevNodes.find(
                (n) =>
                  Number(n.chat_id ?? n.id ?? n.node_id) === Number(parentId)
              )
            : null;

        // 같은 부모를 가진 자식 수 (세로 오프셋용)
        const siblingCount =
          parentId != null
            ? prevEdges.filter((e) => Number(e.source) === Number(parentId))
                .length
            : 0;

        const basePos = parentNode?.position ?? { x: 0, y: 0 };

        // 🔥 간단한 트리 레이아웃
        const pos = {
          x: basePos.x + 280,
          y: basePos.y + siblingCount * 160,
        };
        nextNodes = [
          ...prevNodes,
          {
            type: "CHAT",
            chat_id: nodeIdNum,
            parent: parentId,
            parents: parents ?? [],
            branch_id: branch_id ?? null,
            question: question ?? "",
            children: [],
            keywords: [],
            created_at: created_at ?? new Date().toISOString(),
            pending: true,
            position: pos,
          },
        ];
      }

      // 3) 엣지 (parent → node_id) 추가
      const nextEdges = [...prevEdges];
      if (parentId != null && !Number.isNaN(parentId)) {
        const already = nextEdges.some(
          (e) => Number(e.source) === parentId && Number(e.target) === nodeIdNum
        );
        if (!already) {
          nextEdges.push({
            source: parentId,
            target: nodeIdNum,
          });
        }
      }

      // 4) 부모/자식 정보 채우고 브랜치뷰 갱신
      const nextChat = attachParentChildren({
        ...base,
        nodes: nextNodes,
        edges: nextEdges,
        last_updated: new Date().toISOString(),
      });

      let nextBV = rebuildBranchViewsFromNodes(
        nextChat.nodes ?? [],
        nextChat.edges ?? [],
        roomId,
        latestBranchViewsRef.current
      );

      setBranchViews(nextBV);
      latestBranchViewsRef.current = nextBV;

      return nextChat;
    });
  }

  /* =======================================================================
   * 🧩 임시 노드 제거 (내용/자식 없으면 버림)
   * ======================================================================= */
  function stripTempNodes(chatInfo) {
    const nodes = chatInfo?.nodes ?? [];
    const edges = chatInfo?.edges ?? [];

    // 1) 내용 있는 노드만 남긴다
    const realNodes = nodes.filter((n) => {
      const cid = n.chat_id;
      const num = cid != null ? Number(cid) : NaN;
      if (cid == null || Number.isNaN(num)) return false;

      const hasContent =
        !!n.question || !!n.answer || !!n.summary || !!n.short_summary;
      const hasChildren = Array.isArray(n.children) && n.children.length > 0;

      if (!hasContent && !hasChildren) {
        return false;
      }

      return true;
    });

    const validIds = new Set(realNodes.map((n) => Number(n.chat_id)));

    // 2) 유효한 노드끼리만 잇는 엣지만 남기기
    const realEdges = (edges ?? []).filter((e) => {
      const s = Number(e.source);
      const t = Number(e.target);
      if (Number.isNaN(s) || Number.isNaN(t)) return false;
      return validIds.has(s) && validIds.has(t);
    });

    return {
      ...chatInfo,
      nodes: realNodes,
      edges: realEdges,
    };
  }

  /* =======================================================================
   * ✅ 전체 그래프 + 브랜치뷰 저장 (마스터 그래프 기준)
   * ======================================================================= */
  const persistViews = useCallback(
    (nextChatViews) => {
      const normalized = attachParentChildren(nextChatViews);
      const cleaned = stripTempNodes(normalized);
      const hasGraph =
        (cleaned?.nodes?.length ?? 0) > 0 || (cleaned?.edges?.length ?? 0) > 0;
      const hasBranches =
        !!latestBranchViewsRef.current?.branches &&
        Object.keys(latestBranchViewsRef.current.branches).length > 0;

      if (!hasGraph && !hasBranches) {
        return;
      }

      saveRoomData.mutate(
        {
          roomId: Number(roomId),
          chatInfo: JSON.stringify(cleaned),
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
      const cleaned = stripTempNodes(normalized);
      const hasGraph =
        (cleaned?.nodes?.length ?? 0) > 0 || (cleaned?.edges?.length ?? 0) > 0;
      const hasBranches =
        !!nextBranchViews?.branches &&
        Object.keys(nextBranchViews.branches).length > 0;

      if (!hasGraph && !hasBranches) {
        return;
      }

      console.log("==== [SAVE_DEBUG] persistBoth payload (object) ====");
      console.log({
        roomId: Number(roomId),
        chatInfo: normalized,
        branchView: nextBranchViews,
      });
      console.log(
        "==== [SAVE_DEBUG] persistBoth payload (JSON) ====\n",
        JSON.stringify(
          {
            roomId: Number(roomId),
            chatInfo: normalized,
            branchView: nextBranchViews,
          },
          null,
          2
        )
      );

      saveRoomData.mutate(
        {
          roomId: Number(roomId),
          chatInfo: JSON.stringify(cleaned),
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

  const canvasRef = useRef(null);

  /* =======================================================================
   * ✅ ReactFlow 스냅샷 기반으로
   *    - 마스터 그래프(chatViewsRef.current)
   *    - 브랜치뷰(latestBranchViewsRef.current)
   *    를 재구성하고 저장
   *
   *  - handleSave: validate 후 snapshot 만들어서 호출 (ignoreRfIds 없음)
   *  - handleSend: validate 없이 snapshot 만들어서 호출 (현재 채팅 노드는 ignore)
   * ======================================================================= */
  const flushFromSnapshot = useCallback(
    async (snapshot, options = {}) => {
      const { ignoreRfIds = [] } = options;

      const safeSnapshot =
        snapshot && typeof snapshot === "object"
          ? snapshot
          : { nodes: [], edges: [] };

      const snapNodes = Array.isArray(safeSnapshot?.nodes)
        ? safeSnapshot.nodes
        : [];

      const baseIgnore = new Set((ignoreRfIds || []).map(String));

      // ✅ pendingOps에 등록된 nodeId도 무시 대상으로 추가
      const extraIgnore = new Set(
        [
          ...(pendingOpsRef.current?.chatCopies || []).map((op) =>
            String(op.nodeId)
          ),
          ...(pendingOpsRef.current?.groupAttachments || []).map((op) =>
            String(op.nodeId)
          ),
        ].filter(Boolean)
      );

      const ignoreSet = new Set([...baseIgnore, ...extraIgnore]);

      // RF 노드 id → position 맵
      const posMap = new Map(
        (snapNodes || []).map((n) => [
          String(n.id),
          {
            x: n.position?.x ?? n.x ?? 0,
            y: n.position?.y ?? n.y ?? 0,
          },
        ])
      );

      // RF 부모/자식 맵 (childRFId -> parentRFId)
      const rfParentMap = new Map();
      (safeSnapshot.edges ?? []).forEach((e) => {
        if (!e) return;
        const child = String(e.target);
        const parent = String(e.source);
        rfParentMap.set(child, parent);
      });

      // ✅ 도메인 재구성에 쓸 스냅샷: ignoreSet 에 포함되지 않은 노드들만 사용
      const domainSnapshot = {
        nodes: snapNodes.filter((n) => !ignoreSet.has(String(n.id))),
        edges: (safeSnapshot.edges ?? []).filter(
          (e) =>
            !ignoreSet.has(String(e.source)) && !ignoreSet.has(String(e.target))
        ),
      };

      // ✅ 마스터 그래프(prevChatViews) 기준으로 position만 patch
      const { chatInfo: baseChatInfo, branchView: baseBranchView } =
        rebuildFromSnapshot(
          chatViewsRef.current,
          latestBranchViewsRef.current,
          domainSnapshot,
          roomId,
          { ignoreRfIds: [] }
        );
      console.log(
        "[DEBUG] baseChatInfo nodes after rebuildFromSnapshot:",
        baseChatInfo?.nodes?.map((n) => n.chat_id ?? n.id ?? n.node_id)
      );

      // RF id → 도메인 chat_id 맵 (기존 노드용)
      const flowIdToChatId = new Map();
      (baseChatInfo?.nodes ?? []).forEach((n) => {
        const cid = n.chat_id ?? n.id ?? n.node_id;
        if (cid == null) return;
        const fid = String(cid); // toRF가 chat_id 기반 id 사용한다고 가정
        flowIdToChatId.set(fid, Number(cid));
      });

      const { chatCopies, groupAttachments } = pendingOpsRef.current;
      const hasPending =
        (chatCopies?.length ?? 0) > 0 || (groupAttachments?.length ?? 0) > 0;

      /* ===================================================================
       * 🟢 pendingOps가 전혀 없으면: 레이아웃/삭제만 반영해서 저장
       *    (브랜치 정보는 기존 + 새 계산값을 병합)
       * =================================================================== */
      if (!hasPending) {
        const normalized = attachParentChildren(baseChatInfo);

        // 🔥 로컬 브랜치명 → BranchView에 반영
        let namedBranchView = baseBranchView;
        try {
          namedBranchView = applyLocalBranchNames(
            normalized,
            baseBranchView,
            flowIdToChatId
          );
        } catch (e) {
          console.error("[flushFromSnapshot] applyLocalBranchNames failed:", e);
        }

        // 🔥 기존 branchViews와 새 branchView를 병합
        const prevBV = latestBranchViewsRef.current;
        let mergedBranchView = namedBranchView;

        if (prevBV && prevBV !== namedBranchView) {
          const prevBranches = prevBV.branches || {};
          const nextBranches = namedBranchView?.branches || {};

          mergedBranchView = {
            chat_room_id:
              namedBranchView?.chat_room_id ||
              prevBV.chat_room_id ||
              Number(roomId),
            max_branch_number: Math.max(
              prevBV.max_branch_number || 0,
              namedBranchView?.max_branch_number || 0
            ),
            branches: {
              ...prevBranches,
              ...nextBranches,
            },
            last_updated:
              namedBranchView?.last_updated || prevBV.last_updated || "",
          };
        }

        setChatViews(normalized);
        setBranchViews(mergedBranchView);
        latestBranchViewsRef.current = mergedBranchView;

        setBaseline({
          chatViews: normalized,
          branchViews: mergedBranchView,
        });

        debugLogRoomAndGraph("flushFromSnapshot (no pendingOps, rebuilt)", {
          chatInfoOverride: normalized,
          branchViewOverride: mergedBranchView,
        });

        persistBoth(normalized, mergedBranchView);

        const flowIdMap = {};
        flowIdToChatId.forEach((v, k) => {
          flowIdMap[String(k)] = v;
        });
        return {
          chatInfo: normalized,
          branchView: mergedBranchView,
          snapshot: safeSnapshot,
          flowIdMap,
        };
      }

      /* ===================================================================
       * 🔥 pendingOps가 있는 경우: baseChatInfo/baseBranchView를 시작점으로
       *    붙여넣기/그룹 붙이기를 순차 처리
       * =================================================================== */
      debugLogRoomAndGraph(
        "flushFromSnapshot (with pendingOps, sequential attach from snapshot base)",
        null
      );

      let nextChatViews = baseChatInfo;
      let nextBranchViews = baseBranchView;

      // ================================
      // 3) 채팅 복사(chatCopies) 순차 처리
      // ================================
      for (const { originUid, roomUid, nodeId } of chatCopies || []) {
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

          // RF 스냅샷에서 이 Flow 노드 자체 (data/raw 복사용)
          const snapNodeForNew = snapNodes.find(
            (n) => String(n.id) === nodeKey
          );

          // RF 스냅샷에서 부모 edge 찾기 (부모 → 현재)
          const parentEdge = (safeSnapshot.edges ?? []).find(
            (e) => String(e.target) === nodeKey
          );

          // 부모 chat_id 계산
          let parentChatId = null;
          if (parentEdge) {
            const parentFlowId = String(parentEdge.source);
            parentChatId = flowIdToChatId.get(parentFlowId) ?? null;
          }

          // 형제 edge들 (부모가 이미 다른 자식들을 갖고 있는지)
          const siblingEdges = parentEdge
            ? (safeSnapshot.edges ?? []).filter(
                (e) => String(e.source) === String(parentEdge.source)
              )
            : [];

          const hasOtherChildren =
            parentEdge &&
            siblingEdges.some((e) => String(e.target) !== nodeKey);

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
              ? prevNodes.find(
                  (n) => Number(n.chat_id) === Number(parentChatId)
                )?.branch_id
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

      // ================================
      // 4) 그룹 붙이기(groupAttachments) 순차 처리
      // ================================
      for (const { roomId: rid, group_id, nodeId } of groupAttachments || []) {
        try {
          const response = await attachGroupToRoom.mutateAsync({
            roomId: rid,
            group_id,
          });
          const res = response.data.data;
          console.log("[attachGroupToRoom] response:", res);

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
          const parentEdge = (safeSnapshot.edges ?? []).find(
            (e) => String(e.target) === rfId
          );

          let parentChatId = null;
          if (parentEdge) {
            const parentRFId = String(parentEdge.source);
            parentChatId =
              flowIdToChatId.get(parentRFId) ??
              (!Number.isNaN(Number(parentRFId)) ? Number(parentRFId) : null);
          }

          // 형제 edge들
          const siblingEdges = parentEdge
            ? (safeSnapshot.edges ?? []).filter(
                (e) => String(e.source) === String(parentEdge.source)
              )
            : [];

          const hasOtherChildren =
            parentEdge && siblingEdges.some((e) => String(e.target) !== rfId);

          // branch_id 결정
          const baseBranchId =
            snapNodeForGroup?.data?.branch_id ??
            snapNodeForGroup?.data?.branchId ??
            (parentChatId != null
              ? prevNodes.find(
                  (n) => Number(n.chat_id) === Number(parentChatId)
                )?.branch_id
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

      // ================================
      // 5) RF 부모/자식 맵 기준으로 도메인 엣지 보정
      // ================================
      if (nextChatViews) {
        const currentEdges = nextChatViews.edges ?? [];
        let finalEdges = [...currentEdges];

        rfParentMap.forEach((parentRfId, childRfId) => {
          const parentChatId = flowIdToChatId.get(String(parentRfId));
          const childChatId = flowIdToChatId.get(String(childRfId));

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

      // 7) pendingOps 비우기
      const cleared = {
        chatCopies: [],
        groupAttachments: [],
      };
      setPendingOps(cleared);
      pendingOpsRef.current = cleared;

      const flowIdMap = {};
      flowIdToChatId.forEach((v, k) => {
        flowIdMap[String(k)] = v;
      });
      return {
        chatInfo: nextChatViews,
        branchView: nextBranchViews,
        snapshot: safeSnapshot,
        flowIdMap,
      };
    },
    [
      roomId,
      attachChatFromExisting,
      attachGroupToRoom,
      setErrorMsg,
      setErrorOpen,
      persistBoth,
    ]
  );

  /* -------------------------- SSE / 스트림 관련 -------------------------- */
  const attachHandlers = useSSEStore((s) => s.attachHandlers);
  const sessionUuid = useSSEStore((s) => s.sessionUuid);
  const connected = useSSEStore((s) => s.connected);
  const setSession = useSSEStore((s) => s.setSession);
  const connectRoomSSE = useSSEStore((s) => s.connectRoom); // ✅ roomId 기반 연결

  const preStreamSavedRef = useRef(false);
  const streamRef = useRef({}); // { [chatId: string]: string }
  const [streamTick, setStreamTick] = useState(0);

  // ✨ 첫 CHAT_STREAM 에서만 모달 오픈 여부
  const firstStreamOpenedRef = useRef(false);

  /* ----------------------------- 라우트 / 상태 ----------------------------- */
  const pathname = routeState.location.pathname;
  const isGroups = pathname.startsWith("/groups");

  /* --------------------------- 에러 핸들러 --------------------------- */
  const handleCoreError = useCallback(({ message }) => {
    setErrorMsg(message || "오류가 발생했습니다.");
    setErrorOpen(true);
  }, []);
  useEffect(() => {
    // 🚫 SSE가 시작된 이후에는 절대 서버의 old snapshot으로 초기화하면 안 됨!!
    if (ignoreRoomInit || connected) {
      console.log(
        "[EFFECT BLOCKED] ignoreRoomInit or connected=true → deriveViews 스킵"
      );
      return;
    }

    const next = deriveViews(effectiveRoomData);
    const nextChat = attachParentChildren(next.chatViews);

    setChatViews(nextChat);
    setBranchViews(next.branchViews);
    setBaseline({
      chatViews: nextChat,
      branchViews: next.branchViews,
    });
  }, [effectiveRoomData, ignoreRoomInit, connected]);
  /* ------------------------- FlowCanvas 조작 ------------------------- */
  const handleInit = () => {
    if (!baseline) return;

    setChatViews(baseline.chatViews);
    setBranchViews(baseline.branchViews);
    latestBranchViewsRef.current = baseline.branchViews;
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

    const snapshot = canvasRef.current?.getSnapshot?.() || {
      nodes: [],
      edges: [],
    };

    try {
      await flushFromSnapshot(snapshot, { ignoreRfIds: [] });
    } catch (e) {
      console.error("[handleSave] flushFromSnapshot error:", e);
    }
  }, [chatViews, branchViews, flushFromSnapshot, setErrorMsg, setErrorOpen]);

  /* =======================================================================
   * 🔍 브랜치별/전체 보기용 그래프 필터링 (화면용)
   *   - 실제 저장/계산은 chatViewsRef.current / latestBranchViewsRef.current 기준
   * ======================================================================= */
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

    // 2) 이 브랜치에 포함된 노드들 집합 (branchView 기준)
    const branchSet = new Set(
      (branchInfo.included_nodes ?? [])
        .map((id) => Number(id))
        .filter((v) => !Number.isNaN(v))
    );

    // 🔥 추가: 아직 branchView에 안 들어간 “새 노드”도,
    //        branch_id 가 activeBranchKey 와 같으면 강제로 포함
    const branchIdNum = Number(activeBranchKey);
    nodes.forEach((n) => {
      const rawId = n.chat_id ?? n.id ?? n.node_id;
      const cid = rawId != null ? Number(rawId) : NaN;
      const rawBranch = n.branch_id ?? n.branchId ?? null;
      const bid = rawBranch != null ? Number(rawBranch) : NaN;

      if (!Number.isNaN(cid) && !Number.isNaN(bid) && bid === branchIdNum) {
        branchSet.add(cid);
      }
    });

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
        value: key,
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

  // 🔥 ChatContent에 보여줄 messageGraph (전체/브랜치에 따라 다름)
  const messageGraph = useMemo(() => {
    if (activeBranchKey !== "전체") return filteredGraph;

    if (!firstBranchKeyForWhole) return filteredGraph;

    const base = chatViews ?? { nodes: [], edges: [] };
    const branchInfo = branchViews?.branches?.[firstBranchKeyForWhole];
    if (!branchInfo) return filteredGraph;

    const nodes = base.nodes ?? [];
    const edges = base.edges ?? [];

    const nodeById = new Map(
      nodes.map((n) => [Number(n.chat_id ?? n.id ?? n.node_id), n])
    );

    const branchSet = new Set(
      (branchInfo.included_nodes ?? [])
        .map((id) => Number(id))
        .filter((v) => !Number.isNaN(v))
    );

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

  /* =======================================================================
   * 📨 채팅 전송
   * ======================================================================= */
  const handleSend = useCallback(async () => {
    const t = input.trim();
    if (!t) return;

    const flowNodeId = editingNodeId;
    console.log("[DEBUG] handleSend flowNodeId =", flowNodeId);

    // 최종적으로 서버에 보낼 값
    let parentChatIds = [];
    let branchId = null;

    const isExistingDomainNode =
      flowNodeId != null &&
      (chatViewsRef.current?.nodes ?? []).some(
        (n) => String(n.chat_id ?? n.id ?? n.node_id) === String(flowNodeId)
      );

    let createdNewBranch = false;
    let snapshot = null;
    let flushResult = null;

    // 1) 현재 ReactFlow 스냅샷 → 마스터 그래프에 patch
    if (canvasRef.current?.getSnapshot) {
      try {
        snapshot = canvasRef.current.getSnapshot();
        console.log(
          "[DEBUG] snapshot nodes",
          snapshot.nodes.map((n) => n.id)
        );

        const ignoreIds =
          flowNodeId != null && !isExistingDomainNode
            ? [String(flowNodeId)]
            : [];

        flushResult = await flushFromSnapshot(snapshot, {
          ignoreRfIds: ignoreIds,
        });
      } catch (e) {
        console.error("[handleSend] flushFromSnapshot 실패:", e);
      }
    }

    // 2) flush 결과 기준으로 parentChatIds / branchId 계산
    if (flushResult && flowNodeId != null) {
      const { chatInfo, branchView, flowIdMap } = flushResult;
      const snapEdges = snapshot?.edges ?? [];

      const parentEdge = snapEdges.find(
        (e) => String(e.target) === String(flowNodeId)
      );

      if (parentEdge) {
        const parentFlowId = String(parentEdge.source);
        const parentChatId = flowIdMap[parentFlowId];

        console.log("[handleSend] 부모 RF/Chat 매핑", {
          parentFlowId,
          parentChatId,
        });

        if (parentChatId != null) {
          const baseNodes = chatInfo?.nodes ?? [];
          const baseEdges = chatInfo?.edges ?? [];

          const ancestors = collectAncestorsFromGraph(
            baseNodes,
            Number(parentChatId),
            5
          );

          parentChatIds = [
            Number(parentChatId),
            ...ancestors.map((v) => Number(v)),
          ].filter((v, idx, arr) => !Number.isNaN(v) && arr.indexOf(v) === idx);

          const parentNode = baseNodes.find(
            (n) =>
              Number(n.chat_id ?? n.id ?? n.node_id) === Number(parentChatId)
          );

          let parentBranch =
            parentNode?.branch_id ?? parentNode?.branchId ?? null;

          // 🔥 branchView 기준 fallback
          if (
            (parentBranch == null || Number.isNaN(Number(parentBranch))) &&
            branchView &&
            branchView.branches
          ) {
            const branchesObj = branchView.branches;
            for (const [key, b] of Object.entries(branchesObj)) {
              const ids = (b.included_nodes ?? [])
                .map((id) => Number(id))
                .filter((v) => !Number.isNaN(v));

              if (ids.includes(Number(parentChatId))) {
                parentBranch = Number(key);
                break;
              }
            }
          }

          const domainChildren = baseEdges.filter(
            (e) => Number(e.source) === Number(parentChatId)
          );
          const hasOtherChildren = domainChildren.length >= 1;

          const prevBV = branchView ?? latestBranchViewsRef.current;

          if (!hasOtherChildren) {
            // ✅ 자식이 아직 없으면 → 부모 브랜치 상속
            if (parentBranch != null && !Number.isNaN(Number(parentBranch))) {
              branchId = Number(parentBranch);
            } else {
              branchId = null;
            }
          } else {
            // ✅ 이미 자식이 있으면 → 새 브랜치 번호 발급
            const branchIdsFromBV = Object.keys(prevBV?.branches ?? {})
              .map((k) => Number(k))
              .filter((v) => !Number.isNaN(v));

            const branchIdsFromNodes = baseNodes
              .map((n) => n.branch_id ?? n.branchId ?? null)
              .filter((v) => v != null)
              .map((v) => Number(v))
              .filter((v) => !Number.isNaN(v));

            const allIds = [...branchIdsFromBV, ...branchIdsFromNodes];
            const currentMax =
              allIds.length > 0
                ? Math.max(...allIds)
                : (prevBV?.max_branch_number ?? 0);

            branchId = currentMax + 1;
            createdNewBranch = true;
          }

          console.log("[handleSend] 최종 parentChatIds / branchId", {
            parentChatIds,
            branchId,
            hasOtherChildren,
          });
        }
      }
    }

    // 2-2) Fallback: flushResult가 없거나 부모 매핑 실패한 경우
    if (parentChatIds.length === 0) {
      const baseNodes = chatViewsRef.current?.nodes ?? [];

      let primaryParentId = null;
      let primaryParentNode = null;

      // (A) 1순위: 포커스된 chat 노드
      if (focusedChatId != null) {
        const targetId = Number(focusedChatId);
        if (!Number.isNaN(targetId)) {
          const node = baseNodes.find(
            (n) => Number(n.chat_id ?? n.id ?? n.node_id) === Number(targetId)
          );
          if (node) {
            primaryParentId = targetId;
            primaryParentNode = node;
          }
        }
      }

      // (B) 2순위: 현재 브랜치의 마지막 CHAT 노드
      if (!primaryParentId) {
        const ordered = orderedNodesByGraph(messageGraph);
        const lastChatNode = [...ordered].reverse().find((n) => {
          const type = n.type ?? n.data?.type;
          return type !== "GROUP";
        });

        if (lastChatNode) {
          const cidRaw =
            lastChatNode.chat_id ?? lastChatNode.id ?? lastChatNode.node_id;
          const cid = cidRaw != null ? Number(cidRaw) : NaN;
          if (!Number.isNaN(cid)) {
            primaryParentId = cid;
            primaryParentNode =
              baseNodes.find(
                (n) => Number(n.chat_id ?? n.id ?? n.node_id) === Number(cid)
              ) ?? null;
          }
        }
      }

      if (primaryParentId) {
        const ancestors = collectAncestorsFromGraph(
          baseNodes,
          primaryParentId,
          5
        );

        parentChatIds = [
          Number(primaryParentId),
          ...ancestors.map((v) => Number(v)),
        ].filter((v, idx, arr) => !Number.isNaN(v) && arr.indexOf(v) === idx);

        let parentBranch =
          primaryParentNode?.branch_id ?? primaryParentNode?.branchId ?? null;

        if (
          (parentBranch == null || Number.isNaN(Number(parentBranch))) &&
          activeBranchKey !== "전체"
        ) {
          const parsed = Number(activeBranchKey);
          if (!Number.isNaN(parsed)) parentBranch = parsed;
        }

        if (
          (parentBranch == null || Number.isNaN(Number(parentBranch))) &&
          branchViews?.branches
        ) {
          for (const [key, b] of Object.entries(branchViews.branches)) {
            const ids = (b.included_nodes ?? [])
              .map((id) => Number(id))
              .filter((v) => !Number.isNaN(v));
            if (ids.includes(Number(primaryParentId))) {
              parentBranch = Number(key);
              break;
            }
          }
        }

        if (parentBranch != null && !Number.isNaN(Number(parentBranch))) {
          branchId = Number(parentBranch);
        }
      } else {
        // 부모 노드를 못 찾았으면, 그래도 activeBranchKey를 브랜치로 설정
        if (activeBranchKey !== "전체") {
          const parsed = Number(activeBranchKey);
          if (!Number.isNaN(parsed)) {
            branchId = parsed;
          }
        }
      }

      console.log("[handleSend Fallback] parentChatIds / branchId", {
        parentChatIds,
        branchId,
        focusedChatId,
        activeBranchKey,
      });
    }

    // 3) 새 브랜치를 탄 경우: 브랜치 전환 + 브랜치명 반영
    if (createdNewBranch && branchId != null) {
      setActiveBranchKey(String(branchId));
      setPreviewChatIds(null);

      if (flowNodeId != null) {
        const branchMap = loadJSON(LS_BRANCH_BY_NODE, {});
        const rawName = branchMap[String(flowNodeId)];
        const name = rawName && rawName.trim();

        if (name) {
          setBranchViews((prev) => {
            const prevBV = prev || {
              chat_room_id: Number(roomId) || 0,
              max_branch_number: 0,
              branches: {},
              last_updated: "",
            };

            const prevBranches = prevBV.branches || {};
            const key = String(branchId);
            const prevEntry = prevBranches[key] || {
              branch_name: "",
              included_nodes: [],
              included_edges: [],
            };

            const nextBV = {
              ...prevBV,
              chat_room_id: Number(roomId) || prevBV.chat_room_id || 0,
              max_branch_number: Math.max(
                prevBV.max_branch_number || 0,
                Number(branchId)
              ),
              branches: {
                ...prevBranches,
                [key]: {
                  ...prevEntry,
                  branch_name: name,
                },
              },
              last_updated: new Date().toISOString(),
            };

            latestBranchViewsRef.current = nextBV;

            const normalized = attachParentChildren(
              chatViewsRef.current ?? { nodes: [], edges: [] }
            );
            persistBoth(normalized, nextBV);

            return nextBV;
          });
        }
      }
    }

    // 4) 도메인 그래프에 pending 노드 심기 (UI용)
    if (flowNodeId) {
      const parentId =
        parentChatIds.length > 0 ? Number(parentChatIds[0]) : null;

      setChatViews((prev) => {
        const base = prev ?? { nodes: [], edges: [] };
        const prevNodes = base.nodes ?? [];
        const prevEdges = base.edges ?? [];

        const idx = prevNodes.findIndex(
          (n) => String(n.chat_id ?? n.id ?? n.node_id) === String(flowNodeId)
        );

        let nextNodes = [...prevNodes];

        if (idx >= 0) {
          const old = prevNodes[idx];
          nextNodes[idx] = {
            ...old,
            id: flowNodeId,
            node_id: flowNodeId,
            parent: parentId,
            parents: parentChatIds,
            branch_id: branchId,
            question: t,
            pending: true,
            type: "CHAT",
            created_at: new Date().toISOString(),
          };
        } else {
          nextNodes.push({
            id: flowNodeId,
            node_id: flowNodeId,
            parent: parentId,
            parents: parentChatIds,
            branch_id: branchId ?? null,
            question: t,
            pending: true,
            type: "CHAT",
            created_at: new Date().toISOString(),
          });
        }

        const nextEdges = [...prevEdges];
        if (
          parentId != null &&
          !Number.isNaN(parentId) &&
          !nextEdges.some(
            (e) =>
              Number(e.source) === Number(parentId) &&
              String(e.target) === String(flowNodeId)
          )
        ) {
          nextEdges.push({
            source: parentId,
            target: flowNodeId,
          });
        }

        const nextChat = attachParentChildren({
          ...base,
          nodes: nextNodes,
          edges: nextEdges,
          last_updated: new Date().toISOString(),
        });

        const nextBV = rebuildBranchViewsFromNodes(
          nextChat.nodes ?? [],
          nextChat.edges ?? [],
          roomId,
          latestBranchViewsRef.current
        );

        setBranchViews(nextBV);
        latestBranchViewsRef.current = nextBV;
        chatViewsRef.current = nextChat;
        return nextChat;
      });
    }

    // 5) SSE 연결
    if (!connected) {
      console.log("[handleSend] SSE 미연결 상태 → room 스트림 연결", {
        roomId,
      });
      await connectRoomSSE(Number(roomId));
    } else {
      console.log("[handleSend] SSE 이미 연결되어 있음", {
        roomId,
        connected,
      });
    }

    // 6) 로컬 메시지 & input 정리
    setInput("");

    console.log(
      "채팅 전송하기 payload",
      roomId,
      t,
      parentChatIds,
      branchId,
      modelCode
    );

    // 7) 백엔드에 새 채팅 생성 요청
    try {
      createChat.mutate(
        {
          roomId: Number(roomId),
          question: t,
          parents: parentChatIds,
          branch_id: branchId,
          model: modelCode || "gpt-4o-mini",
          useLlm: false,
        },
        {
          onSuccess: (res, vars) => {
            const room_id = res.roomId;
            const node_id = res.nodeId;
            const created_at = res.createdAt;

            const branch_id = vars.branch_id ?? res.branchId ?? null;
            const parents = Array.isArray(vars.parents) ? vars.parents : [];
            const question = vars.question;

            console.log("[createChat onSuccess] fallback upsert", {
              room_id,
              node_id,
              branch_id,
              parents,
              created_at,
            });

            upsertCreatedChatNode({
              room_id,
              node_id,
              branch_id,
              question,
              parents,
              created_at,
            });
          },
          onError: (e) => {
            console.error("[handleSend] createChat 호출 실패:", e);
          },
        }
      );
    } catch (e) {
      console.error("[handleSend] createChat 호출 실패:", e);
    }

    // 8) RF 노드 라벨 + pending 메시지 로컬 저장
    if (editingNodeId) {
      const branchMap = loadJSON(LS_BRANCH_BY_NODE, {});
      const pending = loadJSON(LS_PENDING_MSGS, []);
      pending.push({
        nodeId: editingNodeId,
        text: t,
        ts: Date.now(),
        branchName: branchMap[editingNodeId] || null,
      });
      saveJSON(LS_PENDING_MSGS, pending);

      if (!isExistingDomainNode) {
        canvasRef.current?.updateNodeLabel(editingNodeId, t);
      }
    }
  }, [
    input,
    editingNodeId,
    flushFromSnapshot,
    roomId,
    createChat,
    connected,
    connectRoomSSE,
    modelCode,
    focusedChatId,
    activeBranchKey,
    branchViews,
    messageGraph,
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

        setEditingNodeId(newNodeId);
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

      const target = allNodes.find(
        (n) => String(n.chat_id ?? n.id ?? n.node_id) === String(nodeId)
      );

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

      const cidRaw = target.chat_id ?? target.id ?? target.node_id;
      const cid =
        cidRaw !== undefined && cidRaw !== null ? Number(cidRaw) : null;
      if (cid !== null && !Number.isNaN(cid)) {
        setFocusedChatId(cid);
      }

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

      if (!panelOpen && nextBranchKey !== activeBranchKey) {
        setActiveBranchKey(nextBranchKey);
      }

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

  const activeBranchLabel = useMemo(() => {
    if (activeBranchKey === "전체") return "전체";
    const b = branchViews?.branches?.[activeBranchKey];
    return b?.branch_name || `브랜치-${activeBranchKey}`;
  }, [activeBranchKey, branchViews]);

  /* -------------------------- 전역 SSE 리스너 -------------------------- */
  useEffect(() => {
    if (!connected) return;

    // 🔥 SSE 스트림 시작 전에, 현재 마스터 그래프/브랜치뷰 한 번 저장
    if (!preStreamSavedRef.current) {
      if (chatViewsRef.current) {
        persistViews(chatViewsRef.current);
      }
      preStreamSavedRef.current = true;
    }

    const off = attachHandlers({
      onQuestionCreated: (payload) => {
        try {
          console.log("[QUESTION_CREATED @ChatFlowPage]", payload);

          const room_id = payload?.room_id ?? payload?.data?.room_id;
          const node_id = payload?.node_id ?? payload?.data?.node_id;
          const branch_id =
            payload?.branch_id ?? payload?.data?.branch_id ?? null;
          const question = payload?.question ?? payload?.data?.question ?? "";
          const parents = Array.isArray(payload?.parents)
            ? payload.parents
            : Array.isArray(payload?.data?.parents)
              ? payload.data.parents
              : [];
          const created_at = payload?.created_at ?? payload?.data?.created_at;

          upsertCreatedChatNode({
            room_id,
            node_id,
            branch_id,
            question,
            parents,
            created_at,
          });
        } catch (e) {
          console.error("[QUESTION_CREATED] merge fail:", e);
        }
      },

      /* ✅ CHAT_STREAM: 델타 + 그래프 조각 */
      onChatStream: (payload) => {
        console.log("[Chat_Stream] response", payload);
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
        console.log("[Chat_Done] response", payload);
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
              pending: false,
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

          console.log(
            "[Chat_Summary_Keywords response",
            payload,
            summary,
            chatId
          );
          setIgnoreRoomInit(true);
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
            console.log("[CHAT_SUMMARY_KEYWORDS] enriched", enriched);
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
          setIgnoreRoomInit(true);
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
              console.log(
                "[ROOM_SHORT_SUMMARY] enriched",
                enriched,
                nextBranchViews
              );
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
  }, [connected, attachHandlers, persistViews, persistBoth, chatViews, roomId]);

  const handleSelectionCountChange = useCallback(
    (count, containsGroup, selNodes) => {
      setSelectedCount(count);
      setHasGroupInSelection(!!containsGroup);
      setSelectedNodesForGroup(selNodes ?? []);
    },
    []
  );

  const visibleChatIdSet = useMemo(() => {
    const nodes = messageGraph?.nodes ?? [];
    const ids = nodes
      .map((n) => (n.chat_id != null ? Number(n.chat_id) : NaN))
      .filter((v) => !Number.isNaN(v));
    return new Set(ids);
  }, [messageGraph]);

  const rf = useMemo(
    () => toRF(filteredGraph ?? { nodes: [], edges: [] }),
    [filteredGraph]
  );

  // 🔥 ReactFlow에 보이는 그래프(filteredGraph) 기준으로만 메시지 생성
  const serverMessages = useMemo(() => {
    const previewSet =
      Array.isArray(previewChatIds) && previewChatIds.length > 0
        ? new Set(previewChatIds.map((v) => Number(v)))
        : null;

    const ordered = orderedNodesByGraph(messageGraph);
    const result = [];

    ordered.forEach((n) => {
      const raw = n || {};
      const data = raw.data || {};
      const cidRaw = raw.chat_id ?? raw.id ?? raw.node_id;
      const cid = cidRaw != null ? Number(cidRaw) : null;
      const nodeType = raw.type ?? data.type ?? null;

      if (previewSet && (cid == null || !previewSet.has(cid))) {
        return;
      }

      // GROUP 노드
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
          chatId: cid,
        });
        return;
      }

      // 일반 CHAT 노드
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
          chatId: cid,
        });
      }

      if (answer) {
        result.push({
          id: `a-${cid ?? Math.random()}`,
          role: "assistant",
          content: answer,
          ts: updatedTs,
          chatId: cid,
        });
      }
    });

    return result;
  }, [messageGraph, previewChatIds]);

  const uiMessages = useMemo(() => {
    let base =
      serverMessages.length === 0 ? [...messages] : [...serverMessages];

    for (const [cid, text] of Object.entries(streamRef.current)) {
      if (!text) continue;

      const numId = Number(cid);
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
    // 1) parentId 기준으로 조상들 모아서 path 계산
    if (parentId != null) {
      const nodes = chatViewsRef.current?.nodes ?? [];

      const ancestors = collectAncestorsFromGraph(nodes, Number(parentId), 20);
      const chain = [Number(parentId), ...ancestors.map((v) => Number(v))]
        .filter((v, idx, arr) => !Number.isNaN(v) && arr.indexOf(v) === idx)
        .reverse();

      if (chain.length > 0) {
        setPreviewChatIds(chain);
        setFocusedChatId(chain[chain.length - 1]);
      }
    }

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

  /* =======================================================================
   * 렌더
   * ======================================================================= */
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
        // 🔥 어떤 노드를 가운데로 스크롤할지
        focusChatId={focusedChatId}
        modelCode={modelCode}
        onModelChange={setModelCode}
        modelSource="available"
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
          if (!nodeId) return;

          if (meta?.empty) {
            handleEmptyNodeClick(nodeId);
            return;
          }

          setEditingNodeId(nodeId);
          setPanelType("chat");
          setPanelOpen(true);
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
