// src/components/ModalShell/contents/ChatContent.jsx

import { useEffect, useRef } from "react";
import * as S from "../ModalShell.styles";

export function ChatContent({
  messages,
  input,
  onInputChange,
  onSend,
  // 🔥 추가
  focusChatId,
}) {
  const bottomRef = useRef(null);

  // 각 메시지 id -> DOM element 매핑용
  const msgRefs = useRef({});

  // 기존: 새 메시지 들어오면 아래로 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 🔥 포커스된 chatId가 변경되면 해당 메시지로 스크롤 (가운데 정렬)
  useEffect(() => {
    if (!focusChatId) return;

    // 현재 메시지 배열 중에서 해당 chatId의 첫 메시지 찾기
    const targetMsg = messages.find((m) => m.chatId === focusChatId);
    if (!targetMsg) return;

    const el = msgRefs.current[targetMsg.id];
    if (el) {
      el.scrollIntoView({
        behavior: "smooth",
        block: "center", // 🔥 중앙에 오도록
      });
    }
  }, [focusChatId, messages]);

  const currentValue = input ?? "";
  const isEmpty = !currentValue.trim();

  const handleEnter = (e) => {
    if (e.key === "Enter" && !isEmpty) onSend?.();
  };

  return (
    <>
      <S.ChatScroll>
        {messages.map((msg) => (
          <div
            key={msg.id}
            // 🔥 각 메시지 DOM을 ref에 저장
            ref={(el) => {
              if (el) {
                msgRefs.current[msg.id] = el;
              }
            }}
          >
            {msg.role === "group" ? (
              <S.GroupTagRow>
                <S.GroupTag>{msg.content}</S.GroupTag>
              </S.GroupTagRow>
            ) : (
              <>
                <S.Bubble $me={msg.role === "user"}>
                  {msg.content}
                  {msg.streaming && (
                    <span style={{ opacity: 0.6, marginLeft: 4 }}>▋</span>
                  )}
                </S.Bubble>
                {msg.role === "assistant" && msg.model && !msg.streaming && (
                  <S.ModelTag>모델 : {msg.model}</S.ModelTag>
                )}
              </>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </S.ChatScroll>

      <S.Footer>
        <S.InputWrap>
          <S.Input
            placeholder="무엇이든 물어보세요"
            value={currentValue}
            onChange={(e) => onInputChange?.(e.target.value)}
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
    </>
  );
}
