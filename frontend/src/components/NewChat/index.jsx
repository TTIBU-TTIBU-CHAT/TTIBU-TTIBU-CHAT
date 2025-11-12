// components/NewChat.jsx
import { useEffect, useRef, useState } from "react";
import * as S from "./NewChat.styles";
import ModalShell from "@/components/ModalShell/ModalShell";
import RouteTransitionOverlay from "@/components/common/RouteTransitionOverlay/RouteTransitionOverlay";
import { useSidebarStore } from "@/store/useSidebarStore";
import { useStartChat } from "@/hooks/useStartChat";
import { useNavigate } from "@tanstack/react-router";

export default function NewChat() {
  const { isCollapsed } = useSidebarStore();
  const navigate = useNavigate();

  // 이동 중복 방지
  const navigatedRef = useRef(null);
  const [redirecting, setRedirecting] = useState(false);

  // 모델 드롭다운
  const [selectedModel, setSelectedModel] = useState("gpt-4o-mini");
  const [modelOpen, setModelOpen] = useState(false);
  const models = ["ChatGPT 5", "ChatGPT 4o", "ChatGPT 3o"];

  // 모달/선택/입력
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [text, setText] = useState("");
  const tagBoxRef = useRef(null);

  // ---- 두 이벤트 모두 수신했는지 체크하는 플래그 + 타겟 roomId 보관 ----
  const flagsRef = useRef({ short: false, keywords: false });
  const targetRoomIdRef = useRef(null);
  const hookRoomIdRef = useRef(null); // useStartChat에서 내려오는 roomId 보관

  // 이벤트 페이로드에서 roomId 뽑기 (백엔드 포맷 다양성 대응)
  const getTargetRoomId = (payload) => {
    return (
      payload?.chat_id ??
      payload?.room_id ??
      payload?.roomId ??
      payload?.data?.chat_id ??
      payload?.data?.roomId ??
      hookRoomIdRef.current ?? // 훅이 반환하는 roomId로 폴백
      null
    );
  };

  // 두 이벤트가 모두 왔는지 확인하고, 한 번만 이동
  const maybeNavigate = () => {
    const { short, keywords } = flagsRef.current;
    if (!short || !keywords) return;
    const id = targetRoomIdRef.current;
    if (!id) return;
    if (navigatedRef.current === id) return;
    navigatedRef.current = id;

    navigate({ to: `/chatrooms/${id}` });
  };

  const { start, roomId, submitting, connected, lastMessage } = useStartChat({
    onRoomCreated: (payload) => {
      // 서버가 주는 형태가 { type, data: {...} } 일 수도, 바로 data일 수도 있으니 모두 대응
      const data = payload?.data ?? payload;
      const rid = data?.room_id ?? data?.roomId ?? data?.chat_id; // 안전하게
      if (!rid) return;
      if (navigatedRef.current === String(rid)) return;
      navigatedRef.current = String(rid);
      setRedirecting(true);
      // ✅ /chatrooms/$roomId 로 이동하면서 초기 데이터(data)도 state로 넘김
      navigate({
        to: "/chatrooms/$roomId",
        params: { roomId: String(rid) },
        state: { roomInit: data },
        replace: true,
      });
    },
    onChatStream: (d) => console.log("[CHAT_STREAM]", d),
    onChatDone: (d) => {
      console.log("[CHAT_DONE]", d);
      const id = getTargetRoomId(d);
      if (!id) return;
      if (navigatedRef.current === id) return;
      navigatedRef.current = id;
      navigate({ to: `/chatrooms/${id}` });
    },
    onRoomShortSummary: (d) => {
      console.log("[ROOM_SHORT_SUMMARY]", d);
      flagsRef.current.short = true;
      targetRoomIdRef.current = getTargetRoomId(d) || targetRoomIdRef.current;
      // maybeNavigate();
    },
    onChatSummaryKeywords: (d) => {
      console.log("[CHAT_SUMMARY_KEYWORDS]", d);
      flagsRef.current.keywords = true;
      targetRoomIdRef.current = getTargetRoomId(d) || targetRoomIdRef.current;
      // maybeNavigate();
    },
    onChatError: (d) => console.error("[CHAT_ERROR]", d),
  });

  // 훅이 주는 roomId 최신값 보관
  useEffect(() => {
    if (roomId) hookRoomIdRef.current = roomId;
  }, [roomId]);

  // 입력창 등의 부수효과
  useEffect(() => {
    if (tagBoxRef.current) {
      tagBoxRef.current.scrollTo({
        top: tagBoxRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [selectedItems]);

  // 바깥 클릭 시 드롭다운 닫기
  useEffect(() => {
    if (!modelOpen) return;
    const onDocClick = () => setModelOpen(false);
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [modelOpen]);

  const stop = (e) => e.stopPropagation();

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isEmpty = text.trim().length === 0;

  // 전송
  const handleSend = async () => {
    if (submitting) return;
    const question = text.trim();
    if (!question) return;
    setRedirecting(true);
    // 새 대화 시작 시 이전 플래그는 리셋해 두세요.
    flagsRef.current = { short: false, keywords: false };
    targetRoomIdRef.current = null;
    navigatedRef.current = null;

    const branchId = 100; // TODO: 실제 값으로 교체
    const useLlm = false;

    const nodes = selectedItems.length
      ? selectedItems.map((it, idx) => ({
          type: (it.type || "").toUpperCase() === "GROUP" ? "GROUP" : "CHAT",
          id: it.id,
          order: idx + 1,
        }))
      : undefined;

    const payload = nodes
      ? { nodes, question, branchId, model: selectedModel, useLlm }
      : { question, branchId, model: selectedModel, useLlm };

    console.log("[POST /rooms] payload:", payload);
    const rid = await start(payload);
    console.log("새 채팅 시작, roomId:", rid);
    if (rid) {
      setText("");
    } else {
      setRedirecting(false); // 실패 시 오버레이 닫기
    }
  };

  useEffect(() => {
    if (lastMessage) console.log("[SSE lastMessage]", lastMessage);
  }, [lastMessage]);

  const openModal = (type) => {
    setModalType(type);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setModalType(null);
  };

  const handleSelect = (item) => {
    setSelectedItems((prev) =>
      console.log("Selected item:", item) || prev.find((i) => i.id === item.id)
        ? prev
        : [...prev, item]
    );
  };
  const handleRemove = (id) => {
    setSelectedItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <S.Container $collapsed={isCollapsed}>
      <S.TopLeftBar onClick={stop}>
        <S.Dropdown>
          <S.DropdownToggler
            onClick={(e) => {
              e.stopPropagation();
              setModelOpen((v) => !v);
            }}
            aria-label="모델 선택"
            title="모델 선택"
          >
            <S.TogglerTextMuted>{selectedModel}</S.TogglerTextMuted>
          </S.DropdownToggler>

          {modelOpen && (
            <S.DropdownList $right onClick={stop}>
              {models.map((m) => (
                <S.DropdownItem
                  key={m}
                  $active={selectedModel === m}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedModel(m);
                    setModelOpen(false);
                  }}
                >
                  {m} {selectedModel === m && <span>✔</span>}
                </S.DropdownItem>
              ))}
            </S.DropdownList>
          )}
        </S.Dropdown>
      </S.TopLeftBar>

      <S.CenterBox>
        {selectedItems.length > 0 && (
          <S.SelectedRow ref={tagBoxRef}>
            {selectedItems.map((item) => (
              <S.SelectedTag key={item.id} $type={item.type}>
                {item.type === "group"
                  ? (item.title ?? item.label)
                  : item.label}
                <button
                  style={{ padding: 5 }}
                  onClick={() => handleRemove(item.id)}
                >
                  ×
                </button>
              </S.SelectedTag>
            ))}
          </S.SelectedRow>
        )}

        <S.InputWrap>
          <S.Input
            placeholder="무엇이든 물어보세요"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <S.SendButton
            type="button"
            aria-label="전송"
            onClick={handleSend}
            disabled={submitting || isEmpty}
            $disabled={submitting || isEmpty}
          >
            <i className="fa-solid fa-angle-right"></i>
          </S.SendButton>
        </S.InputWrap>

        <S.ButtonRow>
          <S.SelectButton
            $active={modalType === "layers"}
            onClick={() => openModal("layers")}
          >
            그룹에서 선택
          </S.SelectButton>
          <S.SelectButton
            $active={modalType === "search"}
            onClick={() => openModal("search")}
          >
            기존 대화에서 선택
          </S.SelectButton>
        </S.ButtonRow>

        {roomId && (
          <div style={{ marginTop: 8, fontSize: 12, color: "#667085" }}>
            roomId: <b>{roomId}</b> / SSE: {connected ? "연결됨" : "연결 대기"}
          </div>
        )}
      </S.CenterBox>

      {modalOpen && (
        <ModalShell
          open={modalOpen}
          onClose={closeModal}
          type={modalType}
          setType={setModalType}
          peek={false}
          showDock={false}
          onPick={handleSelect}
        />
      )}

      <RouteTransitionOverlay
        show={redirecting}
        message="채팅방으로 이동 중..."
      />
    </S.Container>
  );
}
