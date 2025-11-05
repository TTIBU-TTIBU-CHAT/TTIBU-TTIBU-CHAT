// src/pages/ChatFlowPage.jsx
import { useCallback, useRef, useState } from "react";
import styled from "styled-components";
import { useParams } from "@tanstack/react-router";
import { useChatList } from "@/hooks/useChatList";
import BranchDropdown from "@/components/BranchDropdown/BranchDropdown";
import TopleftCard from "@/components/topleftCard/TopleftCard";
import ModalShell from "@/components/ModalShell/ModalShell";
import FlowCanvas from "@/components/Chatflow/FlowCanvas";

export default function ChatFlowPage() {
  const { nodeId } = useParams({ strict: false });
  const { messages, addUser, addAssistant } = useChatList([
    { id: "u1", role: "user", content: "다익스트라 알고리즘 예시 말해줘", ts: Date.now() - 2000 },
    { id: "a1", role: "assistant", content: "다익스트라 알고리즘의 예시입니다.", ts: Date.now() - 1000 },
  ]);
  const [input, setInput] = useState("");
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [branchOpen, setBranchOpen] = useState(false);

  // ✅ 기본 '전체'
  const [branch, setBranch] = useState("전체");

  const [editMode, setEditMode] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelType, setPanelType] = useState("chat");
  const [canReset, setCanReset] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);

  const canvasRef = useRef(null);

  const handleSend = useCallback(() => {
    const t = input.trim();
    if (!t) return;
    addUser(t);
    setInput("");
    setTimeout(() => addAssistant("응답: " + t), 300);
    if (editingNodeId) canvasRef.current?.updateNodeLabel(editingNodeId, t);
  }, [input, addUser, addAssistant, editingNodeId]);

  const handleInit = () => canvasRef.current?.reset();
  const openChatPanel = () => { setPanelType("chat"); setPanelOpen(true); };
  const handleCreateNode = useCallback((newNodeId) => {
    setEditingNodeId(newNodeId);
    setPanelType("chat");
    setPanelOpen(true);
  }, []);
  const showGroupButton = editMode && selectedCount > 1;

  const branchItems = ["전체", "브랜치-1", "브랜치-2", "브랜치-3"].map((v) => ({
    value: v,
    active: v === branch,
  }));

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
        items={branchItems}
        open={branchOpen}
        setOpen={setBranchOpen}
        onSelect={setBranch}
      />

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
        activeBranch={branch}
        onCanResetChange={setCanReset}
        onSelectionCountChange={setSelectedCount}
        onNodeClickInViewMode={openChatPanel}
        onCreateNode={handleCreateNode}
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
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.06);
  cursor: pointer;
`;
