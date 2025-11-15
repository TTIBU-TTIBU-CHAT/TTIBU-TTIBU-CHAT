// src/components/ModalShell/contents/ChatContent.jsx

import { useEffect, useRef } from "react";
import * as S from "../ModalShell.styles";

export function ChatContent({ messages, input, onInputChange, onSend }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const currentValue = input ?? "";
  const isEmpty = !currentValue.trim();

  const handleEnter = (e) => {
    if (e.key === "Enter" && !isEmpty) onSend?.();
  };

  return (
    <>
      <S.ChatScroll>
        {messages.map((msg) => (
          <div key={msg.id}>
            <S.Bubble $me={msg.role === "user"}>
              {msg.content}
              {msg.streaming && (
                <span style={{ opacity: 0.6, marginLeft: 4 }}>▋</span>
              )}
            </S.Bubble>
            {msg.role === "assistant" && msg.model && !msg.streaming && (
              <S.ModelTag>모델 : {msg.model}</S.ModelTag>
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
