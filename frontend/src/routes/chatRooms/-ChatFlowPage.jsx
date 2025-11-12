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

const LS_BRANCH_BY_NODE = "ttibu-branch-by-node";
const LS_PENDING_MSGS = "ttibu-pending-msgs";

/* -------------------------- LocalStorage 유틸 -------------------------- */
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

/* 작은 유틸: 노드 변경 헬퍼 (변경된 key만 수집해 로그용으로 반환) */
function updateNodeByChatId(prevChatViews, chatId, updater) {
  if (!prevChatViews) return { next: prevChatViews, changed: null };
  const nextNodes = prevChatViews.nodes.map((n) => {
    const nid = n?.chat_id ?? n?.id;
    if (String(nid) === String(chatId)) {
      const next = updater(n);
      return next;
    }
    return n;
  });

  const prevNode = prevChatViews.nodes.find(
    (n) => String(n?.chat_id ?? n?.id) === String(chatId)
  );
  const nextNode = nextNodes.find(
    (n) => String(n?.chat_id ?? n?.id) === String(chatId)
  );

  let changed = null;
  if (prevNode && nextNode) {
    changed = {};
    for (const k of Object.keys(nextNode)) {
      if (prevNode[k] !== nextNode[k]) {
        changed[k] = { before: prevNode[k], after: nextNode[k] };
      }
    }
  }
  return { next: { ...prevChatViews, nodes: nextNodes }, changed };
}

/* ======================================================================= */

export default function ChatFlowPage() {
  /* ✅ URL 파라미터 (/chatrooms/$roomId) */
  const { nodeId } = useParams({ strict: false });
  const [roomId] = useState(nodeId);
  console.log("ChatFlowPage roomId:", roomId);

  /* ✅ 라우터 state (NewChat → navigate 시 넘긴 roomInit) */
  const routeState = useRouterState();
  const roomInit = routeState?.location?.state?.roomInit;
  console.log("[ChatFlowPage] roomInit from state:", roomInit);

  /* ✅ 서버 최신 데이터 */
  const {
    data: fetchedRoom,
    isLoading: roomLoading,
    error: roomError,
  } = useRoom(roomId);

  /* ✅ 초기 데이터 우선 사용 */
  const effectiveRoomData =
    roomInit &&
    String(roomInit.room_id ?? roomInit.roomId ?? roomInit.chat_id) ===
      String(roomId)
      ? roomInit
      : fetchedRoom;

  useEffect(() => {
    if (!roomId) return console.log("[useRoom] roomId 없음 → 호출 안 함");
    if (roomLoading) console.log(`[useRoom] 로딩중... roomId=${roomId}`);
    if (roomError) console.error("[useRoom] 에러:", roomError);
    if (fetchedRoom) console.log("[useRoom] 성공:", fetchedRoom);
  }, [roomId, roomLoading, roomError, fetchedRoom]);

  /* ---------------------------------------------------------------------
     ✨ roomInit/effectiveRoomData → chatViews / branchViews 생성
     - nodes → chatViews.nodes (created_at 오름차순 + position 자동 부여)
       + 각 노드 필드 추가:
         group_id: null
         branch_id: (상위 branch_id, 숫자 또는 null)
         parent: (부모 chat_id 또는 null)
         children: (자식 chat_id 배열)
     - chatViews.edges = included_edges
     - position 규칙: (100,100) 시작, x는 250씩 증가
  --------------------------------------------------------------------- */
  const deriveViews = useCallback((src) => {
    // 기본 스켈레톤
    let chatViews = {
      chat_room_id: 0,
      nodes: [],
      edges: [],
      last_updated: "",
    };
    let branchViews = {
      chat_room_id: 0,
      max_branch_number: 0,
      branches: {},
      last_updated: "",
    };

    if (!src) {
      console.log("[deriveViews] src 없음 → 기본값 유지");
      return { chatViews, branchViews };
    }

    const room_id = src.room_id ?? src.roomId ?? 0;
    const branch_id_raw = src.branch_id ?? src.branchId ?? null;
    const branch_id_num = branch_id_raw != null ? Number(branch_id_raw) : null;
    const created_at = src.created_at ?? "";
    const nodesArr = Array.isArray(src.nodes) ? src.nodes : [];

    // 1) created_at 정렬
    const nodesArrSorted = nodesArr.slice().sort((a, b) => {
      const ta = a?.created_at ? +new Date(a.created_at) : 0;
      const tb = b?.created_at ? +new Date(b.created_at) : 0;
      return ta - tb;
    });

    // 2) 좌표 자동 배치
    const START_X = 100;
    const START_Y = 100;
    const GAP_X = 250;

    const nodesWithPos = nodesArrSorted.map((n, i) => {
      const pos = { x: START_X + GAP_X * i, y: START_Y };
      return { ...n, position: pos };
    });

    // 3) included_nodes / included_edges
    let included_nodes = [];
    let included_edges = [];
    if (branch_id_num != null) {
      included_nodes = nodesWithPos
        .map((n) => n?.chat_id ?? n?.id)
        .filter((v) => v != null);

      included_edges =
        included_nodes.length < 2
          ? []
          : included_nodes.slice(1).map((targetId, idx) => ({
              source: included_nodes[idx],
              target: targetId,
            }));
    }

    // 4) parent/children 계산
    const parentMap = new Map();
    const childrenMap = new Map();
    for (const e of included_edges) {
      const { source, target } = e;
      if (target != null) parentMap.set(target, source);
      if (source != null) {
        const arr = childrenMap.get(source) ?? [];
        arr.push(target);
        childrenMap.set(source, arr);
      }
    }

    // 5) 노드 enrich (group_id/branch_id/parent/children)
    const enrichedNodes = nodesWithPos.map((n) => {
      const id = n?.chat_id ?? n?.id;
      const parent = id != null ? parentMap.get(id) ?? null : null;
      const children = id != null ? childrenMap.get(id) ?? [] : [];
      return {
        ...n,
        group_id: null,
        branch_id: branch_id_num,
        parent,
        children,
      };
    });

    // 6) 최종 뷰
    chatViews = {
      chat_room_id: Number(room_id) || 0,
      nodes: enrichedNodes,
      edges: included_edges,
      last_updated: created_at,
    };

    const branchesObj = {};
    if (branch_id_num != null) {
      branchesObj[String(branch_id_num)] = {
        branch_name: "",
        included_nodes,
        included_edges,
      };
    }

    branchViews = {
      chat_room_id: Number(room_id) || 0,
      max_branch_number: branch_id_num || 0,
      branches: branchesObj,
      last_updated: created_at,
    };

    return { chatViews, branchViews };
  }, []);

  // 최초 계산값
  const initialViews = useMemo(
    () => deriveViews(roomInit ?? effectiveRoomData),
    [deriveViews, roomInit, effectiveRoomData]
  );

  // ✅ state로 보관하여 이후 SSE로 갱신 가능하도록
  const [chatViews, setChatViews] = useState(initialViews.chatViews);
  const [branchViews, setBranchViews] = useState(initialViews.branchViews);

  // 최신값 레퍼런스(로그/저장용)
  const latestBranchViewsRef = useRef(branchViews);
  useEffect(() => {
    latestBranchViewsRef.current = branchViews;
  }, [branchViews]);

  // 서버 데이터 교체 시 state 동기화
  useEffect(() => {
    const next = deriveViews(roomInit ?? effectiveRoomData);
    setChatViews(next.chatViews);
    setBranchViews(next.branchViews);
    console.log("[deriveViews -> state sync] chatViews, branchViews 갱신");
  }, [deriveViews, roomInit, effectiveRoomData]);

  /* ------------------------ 채팅 리스트 (Mock) ------------------------ */
  const { messages, addUser, addAssistant } = useChatList([
    {
      id: "u1",
      role: "user",
      content: "다익스트라 알고리즘 예시 말해줘",
      ts: Date.now() - 2000,
    },
    {
      id: "a1",
      role: "assistant",
      content: "다익스트라 알고리즘의 예시입니다.",
      ts: Date.now() - 1000,
      model: "Claude-Sonnet-4",
    },
  ]);

  /* -------------------------- 저장 훅 (multipart/form-data) -------------------------- */
  const saveRoomData = useSaveRoomData();

  // 저장 유틸: chatViews(next) + branchViews(current ref)를 서버에 보냄
  const persistViews = useCallback(
    (nextChatViews) => {
      try {
        const chatInfo = JSON.stringify(nextChatViews);
        const branchView = JSON.stringify(latestBranchViewsRef.current);

        console.log("=== [SAVE] chatInfo ===", nextChatViews);
        console.log("=== [SAVE] branchView ===", latestBranchViewsRef.current);

        saveRoomData.mutate({
          roomId,
          chatInfo,
          branchView,
        });
      } catch (e) {
        console.error("[persistViews] 직렬화 실패:", e);
      }
    },
    [roomId, saveRoomData]
  );

  /* -------------------------- 전역 SSE 리스너 -------------------------- */
  const attachHandlers = useSSEStore((s) => s.attachHandlers);
  const sessionUuid = useSSEStore((s) => s.sessionUuid);

  useEffect(() => {
    if (!sessionUuid) return;

    const getPayloadRoomId = (p) =>
      p?.room_id ?? p?.roomId ?? p?.chat_id ?? p?.data?.room_id;

    const off = attachHandlers({
      onChatStream: (d) => console.log("[ROOM STREAM]", d),

      // ✅ CHAT_DONE: answer / answered_at
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
            console.warn("[CHAT_DONE] chat_id 없음 → 업데이트 불가");
            return;
          }

          setChatViews((prev) => {
            const { next, changed } = updateNodeByChatId(prev, chatId, (node) => ({
              ...node,
              ...(answer !== undefined ? { answer } : {}),
              ...(answered_at !== undefined ? { answered_at } : {}),
            }));

            console.log("=== [CHAT_DONE] 변경 필드 ===", changed ?? "(변경 없음)");
            console.log("=== [CHAT_DONE] chatViews (after) ===", next);
            console.log(
              "=== [CHAT_DONE] branchViews (current) ===",
              latestBranchViewsRef.current
            );

            // 저장
            persistViews(next);
            return next;
          });
        } catch (e) {
          console.error("[CHAT_DONE] update fail:", e);
        }
      },

      // ✅ CHAT_SUMMARY_KEYWORDS: updated_at, summary, keywords
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
          const summary = payload?.summary ?? payload?.data?.summary ?? undefined;
          const keywords =
            payload?.keywords ?? payload?.data?.keywords ?? undefined;

          if (chatId == null) {
            console.warn("[CHAT_SUMMARY_KEYWORDS] chat_id 없음 → 업데이트 불가");
            return;
          }

          setChatViews((prev) => {
            const { next, changed } = updateNodeByChatId(prev, chatId, (node) => ({
              ...node,
              ...(updated_at !== undefined ? { updated_at } : {}),
              ...(summary !== undefined ? { summary } : {}),
              ...(keywords !== undefined ? { keywords } : {}),
            }));

            console.log("=== [CHAT_SUMMARY_KEYWORDS] 변경 필드 ===", changed ?? "(변경 없음)");
            console.log("=== [CHAT_SUMMARY_KEYWORDS] chatViews (after) ===", next);
            console.log(
              "=== [CHAT_SUMMARY_KEYWORDS] branchViews (current) ===",
              latestBranchViewsRef.current
            );

            // 저장
            persistViews(next);
            return next;
          });
        } catch (e) {
          console.error("[CHAT_SUMMARY_KEYWORDS] update fail:", e);
        }
      },

      // ✅ ROOM_SHORT_SUMMARY: short_summary, updated_at  (⚠ chat_id 필수)
      onRoomShortSummary: (evt) => {
        try {
          const payload = evt?.data ?? evt;
          const chatId =
            payload?.chat_id ??
            payload?.id ??
            payload?.node_id ??
            payload?.data?.chat_id;
          const updated_at =
            payload?.updated_at ?? payload?.data?.updated_at ?? undefined;
          const short_summary =
            payload?.short_summary ??
            payload?.data?.short_summary ??
            undefined;

          if (chatId == null) {
            console.warn(
              "[ROOM_SHORT_SUMMARY] chat_id 없음 → 노드 갱신 불가. room/branch 수준 메타만 제공된 것으로 보임."
            );
            return;
          }

          setChatViews((prev) => {
            const { next, changed } = updateNodeByChatId(prev, chatId, (node) => ({
              ...node,
              ...(updated_at !== undefined ? { updated_at } : {}),
              ...(short_summary !== undefined ? { short_summary } : {}),
            }));

            console.log("=== [ROOM_SHORT_SUMMARY] 변경 필드 ===", changed ?? "(변경 없음)");
            console.log("=== [ROOM_SHORT_SUMMARY] chatViews (after) ===", next);
            console.log(
              "=== [ROOM_SHORT_SUMMARY] branchViews (current) ===",
              latestBranchViewsRef.current
            );

            // 저장
            persistViews(next);
            return next;
          });
        } catch (e) {
          console.error("[ROOM_SHORT_SUMMARY] update fail:", e);
        }
      },

      onChatError: (e) => console.error("[ROOM ERROR]", e),
    });

    return () => off && off();
  }, [sessionUuid, attachHandlers, persistViews]);

  /* ----------------------------- 상태 ----------------------------- */
  const pathname = routeState.location.pathname;
  const isGroups = pathname.startsWith("/groups");

  const [input, setInput] = useState("");
  const [editingNodeId, setEditingNodeId] = useState(null);

  const [branchOpen, setBranchOpen] = useState(false);
  const [branch, setBranch] = useState("전체");

  const [editMode, setEditMode] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelType, setPanelType] = useState("chat");
  const [canReset, setCanReset] = useState(false);

  const [selectedCount, setSelectedCount] = useState(0);
  const [hasGroupInSelection, setHasGroupInSelection] = useState(false);

  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState("");

  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [branchNameInput, setBranchNameInput] = useState("");
  const branchPromptResolverRef = useRef(null);

  const [pendingNodeId, setPendingNodeId] = useState(null);
  const [pendingSource, setPendingSource] = useState(null);

  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const canvasRef = useRef(null);

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

  const handleSave = useCallback(() => {
    const result = canvasRef.current?.validateForSave?.();
    if (!result) return;
    if (!result.ok) {
      setErrorMsg(result.errors.join("\n"));
      setErrorOpen(true);
      return;
    }
    console.log("✅ 검증 통과! 저장 진행");
  }, []);

  const openSearchPanel = () => {
    setPanelType("search");
    setPanelOpen(true);
  };

  const handleCreateNode = useCallback(
    (newNodeId, payload, meta) => {
      if (meta?.source === "plus") {
        setPendingNodeId(newNodeId);
        setPendingSource("plus");
        setPanelType("search");
        setPanelOpen(true);
      }
    },
    [isGroups]
  );

  const handlePick = useCallback(
    (payload) => {
      if (pendingNodeId) {
        canvasRef.current?.applyContentToNode(pendingNodeId, payload);
        setPendingNodeId(null);
        setPendingSource(null);
      }
      setPanelOpen(false);
    },
    [pendingNodeId]
  );

  const handleEmptyNodeClick = useCallback(
    (nodeId) => {
      if (!nodeId) return;
      setPendingNodeId(nodeId);
      setPendingSource("emptyClick");
      setPanelType("search");
      setPanelOpen(true);
    },
    [isGroups]
  );

  const handleClosePanel = useCallback(() => {
    setPanelOpen(false);
    if (pendingNodeId && pendingSource === "plus") {
      canvasRef.current?.discardTempNode(pendingNodeId);
    }
    setPendingNodeId(null);
    setPendingSource(null);
  }, [pendingNodeId, pendingSource]);

  const showGroupButton =
    editMode && selectedCount > 1 && !hasGroupInSelection;

  const branchItems = ["전체", "브랜치-1", "브랜치-2", "브랜치-3"].map((v) => ({
    value: v,
    active: v === branch,
  }));

  const openGroupModal = () => {
    setGroupName("");
    setGroupModalOpen(true);
  };
  const confirmGroupName = () => {
    const name = groupName.trim();
    if (!name) return;
    canvasRef.current?.groupSelected?.(name);
    setGroupModalOpen(false);
  };

  const askBranchName = useCallback((parentId, newNodeId) => {
    setBranchNameInput("");
    setBranchModalOpen(true);
    return new Promise((resolve) => {
      branchPromptResolverRef.current = resolve;
    });
  }, []);

  const cancelBranchModal = () => {
    setBranchModalOpen(false);
    if (branchPromptResolverRef.current) {
      branchPromptResolverRef.current(null);
      branchPromptResolverRef.current = null;
    }
  };

  const confirmBranchModal = () => {
    const name = branchNameInput.trim();
    if (!name) return;
    setBranchModalOpen(false);
    if (branchPromptResolverRef.current) {
      branchPromptResolverRef.current(name);
      branchPromptResolverRef.current = null;
    }
  };

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

      <BranchDropdown
        label={branch}
        items={branchItems}
        open={branchOpen}
        setOpen={setBranchOpen}
        onSelect={setBranch}
      />

      {showGroupButton && (
        <S.TopCenterActionBar>
          <S.GroupChip onClick={openGroupModal}>＋ 그룹 생성</S.GroupChip>
        </S.TopCenterActionBar>
      )}

      <ModalShell
        open={panelOpen}
        onOpen={() => setPanelOpen(true)}
        onClose={handleClosePanel}
        type={panelType}
        setType={setPanelType}
        title={branch}
        messages={messages}
        input={input}
        onInputChange={setInput}
        onSend={handleSend}
        peek={false}
        onPick={handlePick}
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

      {/* ✅ FlowCanvas 전달 */}
      <FlowCanvas
        ref={canvasRef}
        editMode={editMode}
        activeBranch={branch}
        onCanResetChange={setCanReset}
        onSelectionCountChange={(count, containsGroup) => {
          setSelectedCount(count);
          setHasGroupInSelection(!!containsGroup);
        }}
        onNodeClickInViewMode={(nodeId, meta) => {
          if (meta?.empty) {
            handleEmptyNodeClick(nodeId);
            return;
          }
          if (isGroups) {
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
        roomData={{ ...effectiveRoomData, ...chatViews }} // 필요 시 전달 형태 조정
        roomLoading={roomLoading}
        roomError={roomError}
      />
    </S.Page>
  );
}
