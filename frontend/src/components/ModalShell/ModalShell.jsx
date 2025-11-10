// ModalShell.jsx
import { useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as S from "./ModalShell.styles";
import { ChatContent } from "./contents/ChatContent";
import { SearchContent } from "./contents/SearchContent";
import { GroupContent } from "./contents/GroupContent";

const TYPE_ORDER = { layers: 0, search: 1, chat: 2 };
const ANIM_MS = 280;

export default function ModalShell({
  open,
  onOpen,
  onClose,
  type = "chat",
  setType,
  title = "브랜치-2",
  messages = [],
  input = "",
  onInputChange,
  onSend,
  peek = false,
  setPeek,
  showDock = true,
  onPick,
  onSelect
}) {
  const panelRef = useRef(null);

  const [peekState, setPeekState] = useState(!!peek);
  useEffect(() => setPeekState(!!peek), [peek]);

  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const hideChatDock = pathname.startsWith("/groups");

  const [branchOpen, setBranchOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(title);
  const [selectedModel, setSelectedModel] = useState("ChatGPT 4o");

  const branches = ["브랜치-1", "브랜치-2", "브랜치-3"];
  const models = ["ChatGPT 5", "ChatGPT 4o", "ChatGPT 3o"];

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

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

  const prevTypeRef = useRef(type);
  const [dir, setDir] = useState("forward");
  const [leavingType, setLeavingType] = useState(null);
  const [leavingHeader, setLeavingHeader] = useState(null);

  // ✅ 전체 화면 상태
  const [fullscreen, setFullscreen] = useState(false);

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
      // 같은 탭 다시 누르면: peek 해제 → 이미 풀오픈이면 닫기
      if (peekState) {
        setPeek?.(false);
        setPeekState(false);
        setFullscreen(false); // ✅ dock으로 건드릴 땐 전체화면 해제
        onOpen?.();
        return;
      }
      onClose?.();
      return;
    }
    setType?.(nextType);
    // 토글 시에는 펼친 상태로
    setPeek?.(false);
    setPeekState(false);
    setFullscreen(false); // ✅ 탭 전환하면 기본 폭으로
    if (!open) onOpen?.();
  };

  /* ===== Header 렌더 ===== */
  const renderHeaderSlots = (renderType) => {
    if (renderType === "chat") {
      return (
        <>
          <S.HeaderLeft>
            {/* ✅ '닫기'가 아니라 '전체 화면 토글' */}
            <S.IconButton
              onClick={(e) => {
                e.stopPropagation();
                if (!open) onOpen?.();
                setPeek?.(false);
                setPeekState(false);
                setFullscreen((v) => !v); // ✅ 토글
              }}
              title={fullscreen ? "기본 너비로" : "전체 화면으로"}
              aria-label={fullscreen ? "기본 너비로" : "전체 화면으로"}
            >
              <i
                className={
                  fullscreen ? "fa-solid fa-compress" : "fa-solid fa-expand"
                }
              />
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
    if (renderType === "search") return <SearchContent onPick={onPick} />;
    return <GroupContent onPick={onPick} />;
  };

  return createPortal(
    <S.Overlay $dim={fullscreen}>
      <S.Panel
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-expanded={open}
        tabIndex={-1}
        $open={open}
        $peek={peekState}
        $fullscreen={fullscreen} // ✅ 전달
        onClick={stop}
      >
        {/* Dock */}
        {showDock && (
          <S.Dock $fullscreen={fullscreen}>
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

        {/* Header */}
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

        {/* Body */}
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
