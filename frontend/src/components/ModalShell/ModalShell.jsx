import { useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as S from "./ModalShell.styles";
import { ChatContent } from "./contents/ChatContent";
import { SearchContent } from "./contents/SearchContent";
import { GroupContent } from "./contents/GroupContent";

/** 타입 순서에 따라 전환 방향 계산 (작을수록 왼쪽, 클수록 오른쪽) */
const TYPE_ORDER = { layers: 0, search: 1, chat: 2 };
const ANIM_MS = 280;

export default function ModalShell({
  open,
  onOpen,
  onClose,
  type = "chat", // 'chat' | 'search' | 'layers'
  setType,
  title = "브랜치-2",
  messages = [],
  input = "",
  onInputChange,
  onSend,
  peek = false,
  showDock = true,
  onPick, // ✅ 클릭 선택 시 부모로 payload 전달 (임시 노드 채우기 등에 사용)

}) {
  const panelRef = useRef(null);
  // ✅ 현재 경로 읽기
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const hideChatDock = pathname.startsWith("/groups");

  // 채팅 헤더 드롭다운
  const [branchOpen, setBranchOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(title);
  const [selectedModel, setSelectedModel] = useState("ChatGPT 4o");

  const branches = ["브랜치-1", "브랜치-2", "브랜치-3"];
  const models = ["ChatGPT 5", "ChatGPT 4o", "ChatGPT 3o"];

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  // 포털 루트
  const portalRoot = useMemo(() => {
    if (typeof window === "undefined") return null;
    let el = document.getElementById("portal-root");
    if (!el) {
      el = document.createElement("div");
      el.id = "portal-root";
      document.body.appendChild(el);
    }
    return el;
  }, []);
  if (!portalRoot) return null;

  const stop = (e) => e.stopPropagation();

  /* ===== 전환 방향 + leaving 레이어 유지 ===== */
  const prevTypeRef = useRef(type);
  const [dir, setDir] = useState("forward");
  const [leavingType, setLeavingType] = useState(null);
  const [leavingHeader, setLeavingHeader] = useState(null);

  useEffect(() => {
    const prev = prevTypeRef.current;
    if (prev !== type) {
      const prevIdx = TYPE_ORDER[prev] ?? 0;
      const nextIdx = TYPE_ORDER[type] ?? 0;
      setDir(nextIdx > prevIdx ? "forward" : "backward");
      setLeavingType(prev);
      setLeavingHeader(prev);
      const t = setTimeout(() => {
        setLeavingType(null);
        setLeavingHeader(null);
      }, ANIM_MS);
      prevTypeRef.current = type;
      return () => clearTimeout(t);
    }
  }, [type]);

  /* ===== Dock 공통 토글 ===== */
  const handleDockToggle = (nextType) => {
    if (open && type === nextType) {
      onClose?.();
      return;
    }
    setType?.(nextType);
    if (!open) onOpen?.();
  };

  /* ===== Header 렌더 ===== */
  const renderHeaderSlots = (renderType) => {
    if (renderType === "chat") {
      return (
        <>
          <S.HeaderLeft>
            <S.IconButton onClick={onClose} title="닫기" aria-label="닫기">
              <i className="fa-solid fa-angles-left" />
            </S.IconButton>
          </S.HeaderLeft>

          <S.HeaderCenter>
            <S.Dropdown>
              <S.DropdownToggler
                onClick={(e) => {
                  e.stopPropagation();
                  setBranchOpen((v) => !v);
                  setModelOpen(false);
                }}
              >
                <S.TogglerText>{selectedBranch}</S.TogglerText>
              </S.DropdownToggler>

              {branchOpen && (
                <S.DropdownList onClick={stop}>
                  {branches.map((b) => (
                    <S.DropdownItem
                      key={b}
                      $active={selectedBranch === b}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBranch(b);
                        setBranchOpen(false);
                      }}
                    >
                      {b} {selectedBranch === b && <span>✔</span>}
                    </S.DropdownItem>
                  ))}
                </S.DropdownList>
              )}
            </S.Dropdown>
          </S.HeaderCenter>

          <S.HeaderRight>
            <S.Dropdown>
              <S.DropdownToggler
                onClick={(e) => {
                  e.stopPropagation();
                  setModelOpen((v) => !v);
                  setBranchOpen(false);
                }}
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
          </S.HeaderRight>
        </>
      );
    }

    // search / layers 공통
    return (
      <>
        <S.HeaderLeft>
          <S.IconButton onClick={onClose} title="닫기" aria-label="닫기">
            <i className="fa-solid fa-angle-right" />
          </S.IconButton>
        </S.HeaderLeft>

        <S.HeaderCenter>
          <S.SearchTitle>
            {renderType === "search" ? "검색" : "그룹"}
          </S.SearchTitle>
        </S.HeaderCenter>

        <S.HeaderRight />
      </>
    );
  };

  /* ===== Content 렌더 ===== */
  const renderContentByType = (renderType) => {
    if (renderType === "chat") {
      return (
        <ChatContent
          messages={messages}
          input={input}
          onInputChange={onInputChange}
          onSend={onSend}
        />
      );
    }
    if (renderType === "search") return <SearchContent onPick={onPick} />; // ✅ 전달
    return <GroupContent onPick={onPick} />; // ✅ 전달

  };

  return createPortal(
    <S.Overlay>
      <S.Panel
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-expanded={open}
        tabIndex={-1}
        $open={open}
        $peek={peek}
        onClick={stop}
      >
        {showDock && (
          <S.Dock>
            {!hideChatDock && (
              <S.DockButton
                title="그룹"
                onClick={() => handleDockToggle("layers")}
              >
                <i className="fa-solid fa-layer-group" />
              </S.DockButton>
            )}


            <S.DockButton
              title="검색"
              onClick={() => handleDockToggle("search")}
            >
              <i className="fa-solid fa-diagram-project" />
            </S.DockButton>
            {/* ✅ /groups에서는 채팅 Dock 버튼 숨김 */}

            {!hideChatDock && (
              <S.DockButton
                title="채팅"
                onClick={() => handleDockToggle("chat")}
              >
                <i className="fa-solid fa-comments" />
              </S.DockButton>
            )}
          </S.Dock>
        )}

        <S.Header>
          {leavingHeader && (
            <S.HeaderLayer
              $phase="leave"
              $dir={dir}
              key={`header-leave-${leavingHeader}`}
            >
              {renderHeaderSlots(leavingHeader)}
            </S.HeaderLayer>
          )}
          <S.HeaderLayer $phase="enter" $dir={dir} key={`header-enter-${type}`}>
            {renderHeaderSlots(type)}
          </S.HeaderLayer>
        </S.Header>

        <S.Body>
          {leavingType && (
            <S.ContentLayer
              $phase="leave"
              $dir={dir}
              key={`content-leave-${leavingType}`}
            >
              {renderContentByType(leavingType)}
            </S.ContentLayer>
          )}
          <S.ContentLayer
            $phase="enter"
            $dir={dir}
            key={`content-enter-${type}`}
          >
            {renderContentByType(type)}
          </S.ContentLayer>
        </S.Body>
      </S.Panel>
    </S.Overlay>,
    portalRoot
  );
}
