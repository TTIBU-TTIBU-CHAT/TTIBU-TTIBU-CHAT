import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import styled from "styled-components";
import ModalShell from "@/components/ModalShell/ModalShell";
import { useChatList } from "@/hooks/useChatList";

export const Route = createFileRoute("/test")({
  component: RouteComponent,
});

function RouteComponent() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("chat"); // 'chat' | 'search' | 'layers'

  const { messages, addUser, addAssistant } = useChatList([
    { id: "u1", role: "user", content: "다익스트라 알고리즘 예시 말해줘", ts: Date.now() - 2000 },
    { id: "a1", role: "assistant", content: "다익스트라 알고리즘의 예시입니다.", ts: Date.now() - 1000 },
  ]);

  const [input, setInput] = useState("");

  const handleSend = () => {
    const t = input.trim();
    if (!t) return;
    addUser(t);
    setInput("");
    setTimeout(() => addAssistant("응답: " + t), 500);
  };

  return (
    <Page>
      <ModalShell
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        type={type}
        setType={setType}
        title="브랜치-2"
        messages={messages}
        input={input}
        onInputChange={setInput}
        onSend={handleSend}
        peek={false}
      />
    </Page>
  );
}

const Page = styled.div`
  position: relative;
  min-height: 100dvh;
  background-color: #fafafa;
  font-family: "Pretendard", "Noto Sans KR", sans-serif;
`;
