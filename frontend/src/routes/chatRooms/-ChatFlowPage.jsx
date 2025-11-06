import { useCallback, useRef, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { useChatList } from "@/hooks/useChatList";
import BranchDropdown from "@/components/BranchDropdown/BranchDropdown";
import TopleftCard from "@/components/topleftCard/TopleftCard";
import ModalShell from "@/components/ModalShell/ModalShell";
import FlowCanvas from "@/components/Chatflow/FlowCanvas";
import * as S from "./-styles.ChatFlowPage";
import InputDialog from "@/components/common/Modal/InputDialog";
import ErrorDialog from "@/components/common/Modal/ErrorDialog";
import { useRouterState } from "@tanstack/react-router";

/* ===== 로컬 스토리지 헬퍼 ===== */
const LS_BRANCH_BY_NODE = "ttibu-branch-by-node"; // { [nodeId]: branchName }
const LS_PENDING_MSGS = "ttibu-pending-msgs"; // [{ nodeId, text, ts, branchName }]

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
  const { nodeId } = useParams({ strict: false });
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
    },
  ]);
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const isGroups = pathname.startsWith("/groups"); // ★ /groups 여부
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

  // 그룹명 모달
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState("");

  // 브랜치명 모달
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [branchNameInput, setBranchNameInput] = useState("");
  const branchPromptResolverRef = useRef(null); // Promise resolver 저장

  // (+)로 생성한 임시 노드 id
  const [pendingNodeId, setPendingNodeId] = useState(null);
  const [pendingSource, setPendingSource] = useState(null);

  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const canvasRef = useRef(null);
  const handleCoreError = useCallback(({ message }) => {
    setErrorMsg(message || "오류가 발생했습니다.");
    setErrorOpen(true);
  }, []);
  /* ===== 채팅 전송 + 로컬 보관 ===== */
  const handleSend = useCallback(() => {
    const t = input.trim();
    if (!t) return;

    addUser(t);
    setInput("");
    setTimeout(() => addAssistant("응답: " + t), 300);

    if (editingNodeId) {
      // 노드 라벨 업데이트
      canvasRef.current?.updateNodeLabel(editingNodeId, t);

      // 로컬 대기 큐에 적재 (백엔드 미구현이므로 저장만)
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

  /* ===== 초기화 ===== */
  const handleInit = () => canvasRef.current?.reset();

  /* ===== 보기 모드에서 노드 클릭 → Search 패널 열기 ===== */
  const openSearchPanel = () => {
    setPanelType("search");
    setPanelOpen(true);
  };

  /* ===== 새 노드 만들 때: plus면 Search 패널 열고 pending 설정 / dnd면 스킵 ===== */
  const handleCreateNode = useCallback(
    (newNodeId, payload, meta) => {
      if (meta?.source === "plus") {
        // 경로와 무관하게: 새 노드에 컨텐츠를 꽂아야 하므로 pending 타깃으로 지정
        setPendingNodeId(newNodeId);
        setPendingSource("plus");
        setPanelType("search"); // 검색/선택 패널에서 payload를 받아 applyContentToNode로 주입
        setPanelOpen(true);
      }
    },
    [isGroups]
  );

  /* ===== Search/Group에서 항목 선택 → pending 노드에 적용 ===== */
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

  /* ===== 빈 노드 클릭 시: 해당 노드를 펜딩 타깃으로 사용 ===== */
  const handleEmptyNodeClick = useCallback(
    (nodeId) => {
      if (!nodeId) return;
      setPendingNodeId(nodeId);
      setPendingSource("emptyClick");
      // 라우트별 기본 열 패널: /groups → search, /chatRooms → search(원하면 chat로 바꿔도 됨)
      setPanelType(isGroups ? "search" : "search");
      setPanelOpen(true);
    },
    [isGroups]
  );
  /* ===== 패널 닫기: pending 노드가 남아있으면 취소(삭제) ===== */
  const handleClosePanel = useCallback(() => {
    setPanelOpen(false);
    if (pendingNodeId && pendingSource === "plus") {
      // '+'로 만든 임시노드는 닫으면 롤백
      canvasRef.current?.discardTempNode(pendingNodeId);
    }
    // 빈 노드 클릭으로 연 건 삭제하지 않음
    setPendingNodeId(null);
    setPendingSource(null);
  }, [pendingNodeId]);

  // 버튼 노출: 그룹 포함 시 숨김
  const showGroupButton = editMode && selectedCount > 1 && !hasGroupInSelection;

  const branchItems = ["전체", "브랜치-1", "브랜치-2", "브랜치-3"].map((v) => ({
    value: v,
    active: v === branch,
  }));

  /* ====== 그룹명 모달 ====== */
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

  /* ====== 브랜치명 모달 (Promise 기반) ====== */
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

  /* ===== FlowCanvas가 브랜치명 확정 통지 → 로컬 저장 ===== */
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
        onSave={() => console.log("저장!")}
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

      {/* 검색/그룹/채팅 패널 */}
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

      {/* 그룹명 입력 모달 -> 공용 InputDialog 재사용 */}
      <InputDialog
        open={groupModalOpen}
        title="그룹명 입력"
        placeholder="예: 검색어 정리, Q&A 묶음…"
        value={groupName}
        setValue={setGroupName}
        onCancel={() => setGroupModalOpen(false)}
        onConfirm={confirmGroupName}
      />

      {/* 브랜치명 입력 모달 -> 공용 InputDialog 재사용 */}
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
        activeBranch={branch}
        onCanResetChange={setCanReset}
        onSelectionCountChange={(count, containsGroup) => {
          setSelectedCount(count);
          setHasGroupInSelection(!!containsGroup);
        }}
        onNodeClickInViewMode={(nodeId, meta) => {
          // 뷰 모드에서 빈 노드라면 곧바로 search 열어서 꽂을 수도 있음(선택)
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
            // 편집 모드에서도 '빈 노드'를 누르면 그 노드를 pending 타깃으로 모달 오픈
            handleEmptyNodeClick(nodeId); // 내부에서 setPendingNodeId + setPanelOpen(true)
            return;
          }
          // (채워진 노드를 클릭했을 때는 모달을 안 열고 싶다면 아무 것도 하지 않으면 됨)
        }}
        onCreateNode={handleCreateNode}
        askBranchName={askBranchName}
        onBranchSaved={handleBranchSaved}
        onError={handleCoreError}
      />
    </S.Page>
  );
}
