// src/routes/test.jsx
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import styled from 'styled-components';
import ChatModal from '@/components/ChatModal/ChatModal';
import { useChatList } from '@/hooks/useChatList';

export const Route = createFileRoute('/test')({
  component: RouteComponent,
});

function RouteComponent() {
  const [open, setOpen] = useState(false);

  // ✅ 채팅 메시지 리스트 관리
  const { messages, addUser, addAssistant } = useChatList([
    {
      id: 'u1',
      role: 'user',
      content: '다익스트라 알고리즘 예시 말해줘',
      ts: Date.now() - 2000,
    },
    {
      id: 'a1',
      role: 'assistant',
      content: '다익스트라 알고리즘의 예시입니다.',
      ts: Date.now() - 1000,
    },
  ]);

  const [input, setInput] = useState('');

  // ✅ 메시지 전송 핸들러
  const handleSend = () => {
    const t = input.trim();
    if (!t) return;
    addUser(t);
    setInput('');

    // 💬 간단한 assistant 응답 예시
    setTimeout(() => addAssistant('응답: ' + t), 500);
  };

  return (
    <Page>
      {/* Chat Modal */}
      <ChatModal
        open={open}
        onOpen={() => setOpen(true)}   // 도킹 버튼에서 열기
        onClose={() => setOpen(false)} // 닫기 버튼
        title="브랜치-2"
        messages={messages}
        input={input}
        onInputChange={setInput}
        onSend={handleSend}
        peek={false}                    // 닫혔을 때 56px 살짝 보이게
      />
    </Page>
  );
}

/* ================= Styled Components ================= */
const Page = styled.div`
  position: relative;
  min-height: 100dvh;
  background-color: #fafafa;
  font-family: 'Pretendard', 'Noto Sans KR', sans-serif;
`;
