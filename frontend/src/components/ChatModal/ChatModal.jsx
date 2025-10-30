import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as S from "./ChatModal.styles";

export default function ChatModal({
  open,
  onOpen,
  onClose,
  title = "브랜치-2",
  messages = [],
  input = "",
  onInputChange,
  onSend,
  peek = true,
}) {
  const panelRef = useRef(null);
  const bottomRef = useRef(null);

  const [branchOpen, setBranchOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState("브랜치-2");
  const [selectedModel, setSelectedModel] = useState("ChatGPT 4o");

  const branches = ["브랜치-1", "브랜치-2", "브랜치-3"];
  const models = ["ChatGPT 5", "ChatGPT 4o", "ChatGPT 3o"];

  const [localInput, setLocalInput] = useState("");

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  // ✅ 현재 입력값 & 비어있는지 여부
  const currentValue = onInputChange ? input : localInput;
  const isEmpty = !currentValue.trim();

  const handleChange = (e) => {
    const v = e.target.value;
    if (onInputChange) onInputChange(v);
    else setLocalInput(v);
  };

  const handleEnter = (e) => {
    if (e.key === "Enter" && !isEmpty) onSend?.();
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
        <S.Dock>
          <S.DockButton title="레이어">
            <i className="fa-solid fa-layer-group" />
          </S.DockButton>

          <S.DockButton title="그래프">
            <i className="fa-solid fa-diagram-project" />
          </S.DockButton>

          <S.DockButton
            title={open ? "채팅 닫기" : "채팅 열기"}
            onClick={(e) => {
              e.stopPropagation();
              open ? onClose?.() : onOpen?.();
            }}
          >
            <i className="fa-solid fa-comments" />
          </S.DockButton>
        </S.Dock>

        <S.Header>
          <S.HeaderLeft>
            <S.IconButton onClick={onClose} title="닫기">
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
        </S.Header>

        <S.Body>
          {messages.map((msg) => (
            <S.Bubble key={msg.id} $me={msg.role === "user"}>
              {msg.content}
            </S.Bubble>
          ))}
          <div ref={bottomRef} />
        </S.Body>

        <S.Footer>
          <S.InputWrap>
            <S.Input
              placeholder="무엇이든 물어보세요"
              value={currentValue}
              onChange={handleChange}
              onKeyDown={handleEnter}
            />
            <S.SendButton
              disabled={isEmpty}
              $disabled={isEmpty}
              onClick={() => !isEmpty && onSend?.()}
              aria-label="전송"
              title={isEmpty ? "메시지를 입력하세요" : "전송"}
            >
              <i className="fa-solid fa-angle-right"></i>
            </S.SendButton>
          </S.InputWrap>
        </S.Footer>
      </S.Panel>
    </S.Overlay>,
    portalRoot
  );
}
