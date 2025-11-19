// components/NewChat.jsx
import { useEffect, useRef, useState } from "react";
import * as S from "./NewChat.styles";
import ModalShell from "@/components/ModalShell/ModalShell";
import RouteTransitionOverlay from "@/components/common/RouteTransitionOverlay/RouteTransitionOverlay";
import { useSidebarStore } from "@/store/useSidebarStore";
import { useStartChat } from "@/hooks/useStartChat";
import { useNavigate } from "@tanstack/react-router";
import { useModels } from "@/hooks/useModels"; // 서버 모델 옵션 훅

export default function NewChat() {
  const { isCollapsed } = useSidebarStore();
  const navigate = useNavigate();

  // 이동 중복 방지
  const navigatedRef = useRef(null);
  const [redirecting, setRedirecting] = useState(false);

  // ✅ 서버 모델 옵션 (항상 기본값이 내려오도록 훅에서 보장하지만, 여기서도 방어)
  const {
    dropdownItems = [], // [{ label: modelName, value: modelCode, uid, isDefault }]
    defaultModelCode = "", // 기본 modelCode
    modelsLoading = false,
    modelsError = null,
  } = useModels() ?? {};

  // 내부 선택 값은 항상 modelCode 로 보관
  const [selectedModel, setSelectedModel] = useState("");

  // 드롭다운 열림

  const [modelOpen, setModelOpen] = useState(false);

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

  const getTargetRoomId = (payload) =>
    payload?.chat_id ??
    payload?.room_id ??
    payload?.roomId ??
    payload?.data?.chat_id ??
    payload?.data?.roomId ??
    hookRoomIdRef.current ??
    null;

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
      const data = payload?.data ?? payload;
      const rid = data?.room_id ?? data?.roomId ?? data?.chat_id;
      if (!rid) return;
      if (navigatedRef.current === String(rid)) return;
      navigatedRef.current = String(rid);
      data.model = selectedModel; // 선택된 모델 코드 추가
      console.log("Room created data:", data);
      setRedirecting(true);

      navigate({
        to: "/chatrooms/$roomId",
        params: { roomId: String(rid) },
        state: {
          roomInit: { ...data, model: selectedModel },
          modelCode: selectedModel, // 🔥 명시적으로 전달
        },
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

  useEffect(() => {
    if (roomId) hookRoomIdRef.current = roomId;
  }, [roomId]);

  useEffect(() => {
    if (tagBoxRef.current) {
      tagBoxRef.current.scrollTo({
        top: tagBoxRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [selectedItems]);

  useEffect(() => {
    if (!modelOpen) return;
    const onDocClick = () => setModelOpen(false);
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [modelOpen]);

  // ✅ 기본 선택: 서버 기본값 → 없으면 첫번째 항목
  useEffect(() => {
    if (!selectedModel) {
      const fallback = dropdownItems[0]?.value ?? "";
      const nextCode = defaultModelCode || fallback;
      if (nextCode) setSelectedModel(nextCode);
    }
  }, [defaultModelCode, dropdownItems, selectedModel]);

  const stop = (e) => e.stopPropagation();

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isEmpty = text.trim().length === 0;

  const handleSend = async () => {
    if (submitting) return;
    const question = text.trim();
    if (!question) return;
    setRedirecting(true);

    flagsRef.current = { short: false, keywords: false };
    targetRoomIdRef.current = null;
    navigatedRef.current = null;

    const branchId = 100; // TODO: 실제 값
    const useLlm = false;

    const nodes = selectedItems.length
      ? selectedItems.map((it, idx) => ({
          type: (it.type || "").toUpperCase() === "GROUP" ? "GROUP" : "CHAT",
          id: it.id,
          order: idx + 1,
        }))
      : undefined;

    // ✅ model 에 modelCode 전송
    const payload = nodes
      ? { nodes, question, branchId, model: selectedModel, useLlm }
      : { question, branchId, model: selectedModel, useLlm };

    console.log("[POST /rooms] payload:", payload);
    const rid = await start(payload);
    console.log("새 채팅 시작, roomId:", rid);
    if (rid) {
      setText("");
    } else {
      setRedirecting(false);
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

  // ✅ 선택된 라벨 계산 (방어)
  const selectedLabel = (() => {
    const item = (dropdownItems || []).find((i) => i.value === selectedModel);
    if (item) return item.label;
    if (modelsLoading) return "모델 불러오는 중…";
    if (modelsError) return "모델 로드 실패";
    return "모델 선택";
  })();

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
            <S.TogglerTextMuted>{selectedLabel}</S.TogglerTextMuted>
          </S.DropdownToggler>

          {modelOpen && (
            <S.DropdownList $right onClick={stop}>
              {modelsLoading && (
                <S.DropdownItem $active={false} disabled>
                  불러오는 중…
                </S.DropdownItem>
              )}
              {!modelsLoading && modelsError && (
                <S.DropdownItem $active={false} disabled>
                  모델 목록을 불러오지 못했습니다
                </S.DropdownItem>
              )}
              {!modelsLoading &&
                !modelsError &&
                (dropdownItems || []).map((it) => (
                  <S.DropdownItem
                    key={it.value}
                    $active={selectedModel === it.value}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedModel(it.value); // modelCode
                      setModelOpen(false);
                    }}
                  >
                    {it.label} {selectedModel === it.value && <span>✔</span>}
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
