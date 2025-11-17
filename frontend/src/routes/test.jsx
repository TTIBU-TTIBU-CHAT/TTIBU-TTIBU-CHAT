import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import styled from "styled-components";

import { useChatList } from "@/hooks/useChatList";
import BranchDropdown from "@/components/BranchDropdown/BranchDropdown";
import TopleftCard from "@/components/topleftCard/TopleftCard";
import ModalShell from "@/components/ModalShell/ModalShell";
import FlowCanvas from "@/components/ChatFlow/FlowCanvas";

export const Route = createFileRoute("/test")({ component: RouteComponent });

function RouteComponent() {
  /* ===== 채팅 데이터 ===== */
  const { messages, addUser, addAssistant } = useChatList([
    { id: "u1", role: "user", content: "다익스트라 알고리즘 예시 말해줘", ts: Date.now() - 2000 },
    { id: "a1", role: "assistant", content: "다익스트라 알고리즘의 예시입니다.", ts: Date.now() - 1000 },
  ]);
  const [input, setInput] = useState("");

  // ➕ 방금 만든(혹은 편집 중인) 노드 id
  const [editingNodeId, setEditingNodeId] = useState(null);

  const handleSend = useCallback(() => {
    const t = input.trim();
    if (!t) return;

    // 채팅 히스토리
    addUser(t);
    setInput("");
    setTimeout(() => addAssistant("응답: " + t), 300);

    // ✏️ 편집 타겟 노드 라벨 갱신
    if (editingNodeId) {
      canvasRef.current?.updateNodeLabel(editingNodeId, t);
      // 필요 시 편집 해제하려면 다음 줄 주석 해제
      // setEditingNodeId(null);
    }
  }, [input, addUser, addAssistant, editingNodeId]);

  /* ===== 상단 컨트롤 ===== */
  const [branchOpen, setBranchOpen] = useState(false);
  const [branch, setBranch] = useState("브랜치-2");
  const branches = ["브랜치-1", "브랜치-2", "브랜치-3"];

  /* ===== 상태 ===== */
  const [editMode, setEditMode] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelType, setPanelType] = useState("chat");

  const canvasRef = useRef(null);
  const [canReset, setCanReset] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);

  const handleInit = () => canvasRef.current?.reset();

  const openChatPanel = () => {
    setPanelType("chat");
    setPanelOpen(true);
  };

  // FlowCanvas가 새 노드를 만들었다고 알려줄 때: 모달 열고, 편집 타겟 지정
  const handleCreateNode = useCallback((newNodeId) => {
    setEditingNodeId(newNodeId);
    setPanelType("chat");
    setPanelOpen(true);
  }, []);

  // 편집 모드 + 2개 이상 선택 시만 그룹 버튼
  const showGroupButton = editMode && selectedCount > 1;

  return (
    <Page>
      <TopleftCard
        editMode={editMode}
        setEditMode={setEditMode}
        onSave={() => console.log("저장!")}
        onInit={handleInit}
        canReset={canReset}
      />

      <BranchDropdown
        label={branch}
        items={branches.map((v) => ({ value: v, active: v === branch }))}
        open={branchOpen}
        setOpen={setBranchOpen}
        onSelect={setBranch}
      />

      {/* ✅ 그룹 생성 버튼 */}
      {showGroupButton && (
        <TopCenterActionBar>
          <GroupChip onClick={() => canvasRef.current?.groupSelected()}>
            ＋ 그룹 생성
          </GroupChip>
        </TopCenterActionBar>
      )}

      <ModalShell
        open={panelOpen}
        onOpen={() => setPanelOpen(true)}
        onClose={() => setPanelOpen(false)}
        type={panelType}
        setType={setPanelType}
        title={branch}
        messages={messages}
        input={input}
        onInputChange={setInput}
        onSend={handleSend}
        peek={false}
      />

      <FlowCanvas
        ref={canvasRef}
        editMode={editMode}
        onCanResetChange={setCanReset}
        onSelectionCountChange={setSelectedCount}
        onNodeClickInViewMode={openChatPanel}
        onCreateNode={handleCreateNode}   // ⬅️ 새 노드 생성 시 모달 열고 편집 대상 지정
      />
    </Page>
  );
}

/* ===== styled ===== */
const Page = styled.div`
  position: relative;
  min-height: 100dvh;
`;

const TopCenterActionBar = styled.div`
  position: absolute;
  top: 48px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 4;
`;

const GroupChip = styled.button`
  height: 30px;
  padding: 0 14px;
  border: 1px solid #bfead0;
  background: #e9f7f0;
  color: #2d9364;
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 800;
  box-shadow: 0 6px 14px rgba(0,0,0,.06);
  cursor: pointer;
`;

export default Route;
