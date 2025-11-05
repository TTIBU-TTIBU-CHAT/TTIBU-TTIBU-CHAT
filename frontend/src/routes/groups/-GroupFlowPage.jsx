// src/routes/groups/GroupFlowPage.jsx
import { useCallback, useRef, useState } from "react";
import styled from "styled-components";

import { useChatList } from "@/hooks/useChatList";
import TopleftCard from "@/components/topleftCard/TopleftCard";
import ModalShell from "@/components/ModalShell/ModalShell";
import FlowCanvas from "@/components/Groupflow/FlowCanvas";

export default function GroupFlowPage() {
  /* ===== 채팅 데이터 ===== */
  const { messages, addUser, addAssistant } = useChatList([
    { id: "u1", role: "user", content: "다익스트라 알고리즘 예시 말해줘", ts: Date.now() - 2000 },
    { id: "a1", role: "assistant", content: "다익스트라 알고리즘의 예시입니다.", ts: Date.now() - 1000 },
  ]);
  const [input, setInput] = useState("");

  const canvasRef = useRef(null);

  // ➕로 생성한 임시 노드 id (Search/Group 선택 시 여기에 채워넣음)
  const [pendingNodeId, setPendingNodeId] = useState(null);

  const handleSend = useCallback(() => {
    const t = input.trim();
    if (!t) return;

    addUser(t);
    setInput("");
    setTimeout(() => addAssistant("응답: " + t), 300);

    // 텍스트 전송은 노드 라벨 업데이트와 별개(원하면 연결 가능)
  }, [input, addUser, addAssistant]);

  /* ===== 상태 ===== */
  const [branch, setBranch] = useState("브랜치-2");
  const [editMode, setEditMode] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelType, setPanelType] = useState("search");
  const [canReset, setCanReset] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);

  const handleInit = () => canvasRef.current?.reset();

  // 보기 모드에서 노드 클릭 시: SearchContent 열기(예약 노드 없음)
  const openSearchPanel = () => {
    setPanelType("search");
    setPanelOpen(true);
  };

  // FlowCanvas가 노드를 만들었을 때
  // - source === 'plus'  : 임시 노드 → Search 패널 열고 pending 설정
  // - source === 'dnd'   : 드래그-드롭 생성 → 패널 열지 않음
  const handleCreateNode = useCallback((newNodeId, payload, meta) => {
    if (meta?.source === "plus") {
      setPendingNodeId(newNodeId);
      setPanelType("search");
      setPanelOpen(true);
    } else {
      // dnd로 만들어진 노드는 이미 payload가 채워짐 → 패널 안 열어도 됨
      // 필요하면 아래 한 줄로 상세보기/검색 패널 열도록 선택 가능
      // setPanelOpen(true);
    }
  }, []);

  // SearchContent/GroupContent에서 항목 하나를 선택했을 때 호출할 함수를 모달에 전달
  // ModalShell 내부에서 onPick(payload) 형태로 콜백해주는 시나리오 가정
  const handlePickContent = useCallback((payload) => {
    if (pendingNodeId) {
      canvasRef.current?.applyContentToNode(pendingNodeId, payload);
      setPendingNodeId(null);
    } else {
      // (+) 없이 선택하는 경우라면: 여기서 바로 새 노드 생성해서 붙이고 싶다면
      // 별도 API를 만들어도 되지만, 현재는 DnD로만 무노드-추가를 지원하므로 skip.
    }
    // 선택 후에는 모달 유지/닫기 정책 선택: 여기선 닫음
    setPanelOpen(false);
  }, [pendingNodeId]);

  // 모달 닫힘: 임시 노드가 남아있다면 삭제
  const handleClosePanel = useCallback(() => {
    setPanelOpen(false);
    if (pendingNodeId) {
      canvasRef.current?.discardTempNode(pendingNodeId);
      setPendingNodeId(null);
    }
  }, [pendingNodeId]);

  // 저장 버튼: 선형 검증(루트 1개 등) 통과해야만 저장
  const handleSave = useCallback(() => {
    const result = canvasRef.current?.validateForSave?.();
    if (!result) return;
    if (!result.ok) {
      alert("저장할 수 없습니다:\n" + result.errors.join("\n"));
      return;
    }
    // TODO: 정상 저장 로직
    console.log("✅ 검증 통과! 저장 진행");
  }, []);

  // 편집 모드 + 2개 이상 선택 시만 그룹 버튼 (옵션)
  const showGroupButton = editMode && selectedCount > 1;

  return (
    <Page>
      <TopleftCard
        editMode={editMode}
        setEditMode={setEditMode}
        onSave={handleSave}
        onInit={handleInit}
        canReset={canReset}
      />

      {/* {showGroupButton && (
        <TopCenterActionBar>
          <GroupChip onClick={() => canvasRef.current?.groupSelected()}>
            ＋ 그룹 생성
          </GroupChip>
        </TopCenterActionBar>
      )} */}

      <ModalShell
        open={panelOpen}
        onOpen={() => setPanelOpen(true)}
        onClose={handleClosePanel}     // ★ 닫을 때 임시 노드 제거
        type={panelType}
        setType={setPanelType}
        title={branch}
        messages={messages}
        input={input}
        onInputChange={setInput}
        onSend={handleSend}
        peek={false}
        onPick={handlePickContent}      // ★ Search/Group에서 선택 시 호출
      />

      <FlowCanvas
        ref={canvasRef}
        editMode={editMode}
        onCanResetChange={setCanReset}
        onSelectionCountChange={setSelectedCount}
        onNodeClickInViewMode={openSearchPanel}    // 보기 모드 클릭 → SearchContent
        onCreateNode={handleCreateNode}            // 노드 생성 시 메타에 따라 처리
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
