import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function ChatModal({
  open,
  onOpen,            // ✅ 추가: 열기 콜백
  onClose,
  title = "브랜치-2",
  messages = [],
  input = "",
  onInputChange,
  onSend,
}) {
  const panelRef = useRef(null);
  const bottomRef = useRef(null);

  // 드롭다운
  const [branchOpen, setBranchOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState("브랜치-2");
  const [selectedModel, setSelectedModel] = useState("ChatGPT 4o");
  const branches = ["브랜치-1", "브랜치-2", "브랜치-3"];
  const models = ["ChatGPT 5", "ChatGPT 4o", "ChatGPT 3o"];

  const [localInput, setLocalInput] = useState("");

  useEffect(() => { if (open) panelRef.current?.focus(); }, [open]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const portalRoot = useMemo(() => {
    if (typeof window === "undefined") return null;
    let el = document.getElementById("portal-root");
    if (!el) { el = document.createElement("div"); el.id = "portal-root"; document.body.appendChild(el); }
    return el;
  }, []);
  if (!portalRoot) return null;

  const stop = (e) => e.stopPropagation();

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end bg-transparent pointer-events-none">
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-expanded={open}
        tabIndex={-1}
        className={[
          "relative h-dvh w-full max-w-[440px] bg-white shadow-2xl border-l border-black/5",
          "flex flex-col transition-transform duration-300 ease-out pointer-events-auto",
          // ✅ 닫힘 상태에서도 56px 만큼은 화면 안에 보이게
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
        onClick={stop}
      >
        {/* ✅ 모달 왼쪽 도킹 버튼 (항상 렌더링) */}
        <div className="pointer-events-none absolute -left-14 top-4 z-50 flex flex-col items-center gap-3">
          <button
            type="button"
            aria-label="버튼1"
            className="pointer-events-auto h-11 w-11 rounded-full bg-white shadow-xl border flex items-center justify-center hover:shadow-2xl hover:ring-2 hover:ring-black/10"
            onClick={(e) => { e.stopPropagation(); /* 필요 기능 */ }}
          >
            <span className="text-xl">🗂️</span>
          </button>

          <button
            type="button"
            aria-label="버튼2"
            className="pointer-events-auto h-11 w-11 rounded-full bg-white shadow-xl border flex items-center justify-center hover:shadow-2xl hover:ring-2 hover:ring-black/10"
            onClick={(e) => { e.stopPropagation(); /* 필요 기능 */ }}
          >
            <span className="text-xl">🔗</span>
          </button>

          {/* ✅ 토글: 열려 있으면 닫기, 닫혀 있으면 열기 */}
          <button
            type="button"
            aria-label={open ? "채팅 닫기" : "채팅 열기"}
            className="pointer-events-auto h-11 w-11 rounded-full bg-white shadow-xl border flex items-center justify-center hover:shadow-2xl hover:ring-2 hover:ring-black/10"
            onClick={(e) => {
              e.stopPropagation();
              if (open) onClose?.();
              else onOpen?.();
            }}
          >
            <span className="text-xl">💬</span>
          </button>
        </div>

        {/* 헤더 */}
        <header className="relative h-14 shrink-0 flex items-center px-4 border-b border-black/10">
          <button
            onClick={onClose}
            aria-label="닫기"
            className="mr-2 inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5"
          >
            <span className="text-xl leading-none">←</span>
          </button>

          {/* 브랜치 */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setBranchOpen(v => !v); setModelOpen(false); }}
              className="text-sm font-semibold flex items-center gap-1"
            >
              {selectedBranch}
              <svg className={`h-4 w-4 transition-transform ${branchOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24">
                <path d="M19 9l-7 7-7-7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {branchOpen && (
              <ul onClick={stop} className="absolute left-0 mt-2 w-32 rounded-xl border bg-white shadow-lg text-sm overflow-hidden z-50">
                {branches.map((b) => (
                  <li
                    key={b}
                    onClick={(e) => { e.stopPropagation(); setSelectedBranch(b); setBranchOpen(false); }}
                    className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${selectedBranch === b ? "bg-gray-50 font-medium text-black" : "text-gray-700"}`}
                  >
                    {b}{selectedBranch === b && <span className="float-right">✔</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 모델 */}
          <div className="relative ml-auto">
            <button
              onClick={(e) => { e.stopPropagation(); setModelOpen(v => !v); setBranchOpen(false); }}
              className="text-sm text-gray-700 flex items-center gap-1"
            >
              {selectedModel}
              <svg className={`h-4 w-4 transition-transform ${modelOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24">
                <path d="M19 9l-7 7-7-7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {modelOpen && (
              <ul onClick={stop} className="absolute right-0 mt-2 w-36 rounded-xl border bg-white shadow-lg text-sm overflow-hidden z-50">
                {models.map((m) => (
                  <li
                    key={m}
                    onClick={(e) => { e.stopPropagation(); setSelectedModel(m); setModelOpen(false); }}
                    className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${selectedModel === m ? "bg-gray-50 font-medium text-black" : "text-gray-700"}`}
                  >
                    {m}{selectedModel === m && <span className="float-right">✔</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </header>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-2xl px-4 py-2 max-w-[85%] border text-sm ${
                msg.role === "user" ? "bg-white ml-auto shadow-sm" : "bg-gray-100 text-gray-700"
              }`}
            >
              {msg.content}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* 입력 */}
        <footer className="shrink-0 p-3 border-t border-black/10">
          <div className="flex items-center gap-2 rounded-full border px-3 py-2">
            <input
              placeholder="무엇이든 물어보세요"
              className="flex-1 outline-none bg-transparent text-sm"
              value={onInputChange ? input : localInput}
              onChange={(e) => { if (onInputChange) onInputChange(e.target.value); else setLocalInput(e.target.value); }}
              onKeyDown={(e) => { if (e.key === "Enter") onSend?.(); }}
            />
            <button onClick={() => onSend?.()} className="h-9 px-4 rounded-full bg-black text-white text-sm">
              전송
            </button>
          </div>
        </footer>
      </section>
    </div>,
    portalRoot
  );
}
