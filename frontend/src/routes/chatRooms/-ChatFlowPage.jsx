// src/routes/.../ChatFlowPage.jsx
import { useCallback, useRef, useState, useEffect } from "react";
import { useParams, useRouterState } from "@tanstack/react-router";
import { useChatList } from "@/hooks/useChatList";
import BranchDropdown from "@/components/BranchDropdown/BranchDropdown";
import TopleftCard from "@/components/topleftCard/TopleftCard";
import ModalShell from "@/components/ModalShell/ModalShell";
import FlowCanvas from "@/components/ChatFlow/FlowCanvas"; // ★ 경로 확인 (Flow/FlowCanvas)
import * as S from "./-styles.ChatFlowPage";
import InputDialog from "@/components/common/Modal/InputDialog";
import ErrorDialog from "@/components/common/Modal/ErrorDialog";
import { useRoom } from "@/hooks/useChatRooms";

const LS_BRANCH_BY_NODE = "ttibu-branch-by-node";
const LS_PENDING_MSGS = "ttibu-pending-msgs";

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

export default function ChatFlowPage() {
  // ✅ URL: /chatrooms/$roomId  라우트에서 roomId를 바로 받는다
  const { nodeId } = useParams({ strict: false });
  const [roomId,setRoomId] = useState(nodeId);
  console.log("ChatFlowPage roomId:", roomId);

  // 상세 조회
  const {
    data: roomData,
    isLoading: roomLoading,
    error: roomError,
  } = useRoom(roomId);
  console.log("useRoom data:", roomData);
  // 로딩/성공/에러 콘솔 출력
  useEffect(() => {
    if (!roomId) {
      console.log("[useRoom] roomId 없음 → 호출 안 함");
      return;
    }
    if (roomLoading) console.log(`[useRoom] 로딩중... roomId=${roomId}`);
    if (roomError) console.error("[useRoom] 에러:", roomError);
    if (roomData) console.log("[useRoom] 성공:", roomData);
  }, [roomId, roomLoading, roomError, roomData]);

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

  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
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

  const handleCoreError = useCallback(({ message }) => {
    setErrorMsg(message || "오류가 발생했습니다.");
    setErrorOpen(true);
  }, []);

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

  const showGroupButton = editMode && selectedCount > 1 && !hasGroupInSelection;

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

  return (
    <S.Page>
      <TopleftCard
        editMode={editMode}
        setEditMode={setEditMode}
        onSave={handleSave}
        onInit={handleInit}
        canReset={canReset}
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

      {/* ✅ ReactFlow에는 아직 주입하지 않고, FlowCore까지 전달만 해서 콘솔 출력 */}
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
        // ★ 전달만
        roomId={roomId}
        roomData={roomData}
        roomLoading={roomLoading}
        roomError={roomError}
      />
    </S.Page>
  );
}
