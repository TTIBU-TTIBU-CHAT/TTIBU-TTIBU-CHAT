// src/routes/groups/GroupFlowPage.jsx
import { useCallback, useRef, useState, useEffect } from "react";
import styled from "styled-components";

import { useParams } from "@tanstack/react-router";
import { groupService } from "@/services/groupService";
import {
  useCreateGroup,
  useUpdateGroup,
  useRenameGroup,
} from "@/hooks/useGroups";
import { useChatList } from "@/hooks/useChatList";
import TopleftCard from "@/components/topleftCard/TopleftCard";
import ModalShell from "@/components/ModalShell/ModalShell";
import FlowCanvas from "@/components/GroupFlow/FlowCanvas";
import ErrorDialog from "@/components/common/Modal/ErrorDialog";

export default function GroupFlowPage() {
  /* ===== URL 파라미터 ===== */
  const { groupId } = useParams({ from: "/groups/$groupId" });

  /* ===== 그룹 상세 상태 ===== */
  const [groupData, setGroupData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const updateGroup =useUpdateGroup();
  /* ===== 그룹 상세 불러오기 ===== */
  useEffect(() => {
    const fetchGroupDetail = async () => {
      if (!groupId) {
        console.log(groupId);
        return;
      }

      try {
        setLoading(true);
        const res = await groupService.detail(groupId);
        if (res?.data?.status === "success") {
          setGroupData(res.data.data);
          console.log(
            "[GROUP_FLOW_PAGE] 그룹 상세 불러오기 성공:",
            res.data.data
          );
        } else {
          throw new Error("그룹 정보를 불러오지 못했습니다.");
        }
      } catch (err) {
        console.error("[GROUP_FLOW_PAGE] 그룹 상세 조회 실패:", err);
        setError("그룹 정보를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetchGroupDetail();
  }, [groupId]);

  /* ===== 채팅 데이터 ===== */
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
  const [input, setInput] = useState("");
  const canvasRef = useRef(null);

  // ➕로 생성한 임시 노드 id (Search/Group 선택 시 여기에 채워넣음)
  const [pendingNodeId, setPendingNodeId] = useState(null);
  const [pendingSource, setPendingSource] = useState(null);

  // 오류 모달 상태
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
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

  // 보기 모드에서 노드 클릭: 빈 노드면 그 노드에 꽂기, 아니면 그냥 검색 열기
  const openSearchPanel = (nodeId, meta) => {
    if (meta?.empty && nodeId) {
      setPendingNodeId(nodeId);
      setPendingSource("emptyClick");
    }
    setPanelType("search");
    setPanelOpen(true);
  };

  // FlowCanvas가 노드를 만들었을 때
  // - source === 'plus'  : 임시 노드 → Search 패널 열고 pending 설정
  // - source === 'dnd'   : 드래그-드롭 생성 → 패널 열지 않음
  const handleCreateNode = useCallback((newNodeId, payload, meta) => {
    setPendingNodeId(newNodeId);
    setPendingSource("plus");
    setPanelType("search"); // 검색/선택 패널에서 payload를 받아 applyContentToNode로 주입
    setPanelOpen(true);
  }, []);

  // SearchContent/GroupContent에서 항목 하나를 선택했을 때 호출할 함수를 모달에 전달
  // ModalShell 내부에서 onPick(payload) 형태로 콜백해주는 시나리오 가정
  const handlePickContent = useCallback(
    (payload) => {
      if (pendingNodeId) {
        canvasRef.current?.applyContentToNode(pendingNodeId, payload);
        setPendingNodeId(null);
        setPendingSource(null);
      } else {
        // (+) 없이 선택하는 경우라면: 여기서 바로 새 노드 생성해서 붙이고 싶다면
        // 별도 API를 만들어도 되지만, 현재는 DnD로만 무노드-추가를 지원하므로 skip.
      }
      // 선택 후에는 모달 유지/닫기 정책 선택: 여기선 닫음
      setPanelOpen(false);
    },
    [pendingNodeId]
  );

  // 모달 닫힘: 임시 노드가 남아있다면 삭제
  const handleClosePanel = useCallback(() => {
    setPanelOpen(false);
    if (pendingNodeId && pendingSource === "plus") {
      canvasRef.current?.discardTempNode(pendingNodeId);
    }
    setPendingNodeId(null);
    setPendingSource(null);
  }, [pendingNodeId]);

  // 저장 버튼: 선형 검증(루트 1개 등) 통과해야만 저장
  const handleSave = useCallback(async () => {
    const result = canvasRef.current?.validateForSave?.();
    if (!result) return;
    if (!result.ok) {
      alert("저장할 수 없습니다:\n" + result.errors.join("\n"));
      return;
    }
    if (!result.ok) {
      setErrorMsg(result.errors.join("\n"));
      setErrorOpen(true);
      return;
    }
    // ✅ 검증 통과 후, ReactFlow에서 연결 순서대로 nodeId 배열을 가져옴
    const orderedNodeIds = canvasRef.current?.getOrderedNodeIds?.() ?? [];

    console.log(
      "[GROUP_FLOW_PAGE] 저장 직전 nodeId 배열:",
      { groupId, orderedNodeIds },
      groupData?.name,
      groupData
    );

    // 여기서 그룹 내용 수정 API 호출하면 됨 (예시는 추측입니다)
    await updateGroup.mutateAsync({
      groupId: Number(groupId),
      name: groupData?.name,
      nodes: orderedNodeIds,
      summary_regen: true,
    });

    console.log("✅ 검증 통과! (API 호출은 위 부분에서 연결)");
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
        onClose={handleClosePanel} // ★ 닫을 때 임시 노드 제거
        type={panelType}
        setType={setPanelType}
        title={branch}
        messages={messages}
        input={input}
        onInputChange={setInput}
        onSend={handleSend}
        peek={false}
        onPick={handlePickContent} // ★ Search/Group에서 선택 시 호출
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
        groupData={groupData}
        onCanResetChange={setCanReset}
        onSelectionCountChange={setSelectedCount}
        // 보기 모드 클릭: meta.empty면 해당 노드를 펜딩 타깃으로 사용
        onNodeClickInViewMode={(nodeId, meta) => openSearchPanel(nodeId, meta)}
        // 편집 모드 클릭: 빈 노드면 그 노드로 search/layers 열어서 꽂기
        onEditNodeClick={(nodeId, meta) => {
          if (meta?.empty && nodeId) {
            // 편집 모드에서도 '빈 노드'를 누르면 그 노드를 pending 타깃으로 모달 오픈
            handleEmptyNodeClick(nodeId); // 내부에서 setPendingNodeId + setPanelOpen(true)
            return;
          }
          // (채워진 노드를 클릭했을 때는 모달을 안 열고 싶다면 아무 것도 하지 않으면 됨)
        }}
        onCreateNode={handleCreateNode}
        onError={({ message }) => {
          setErrorMsg(message || "오류가 발생했습니다.");
          setErrorOpen(true);
        }}
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
