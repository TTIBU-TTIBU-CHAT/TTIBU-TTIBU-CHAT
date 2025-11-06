import React from "react";
import styled from "styled-components";
import Modal, { ModalButton } from "./Modal";

export default function ErrorDialog({
  open,
  title = "오류",
  message = "",
  detail = "",
  onClose,
  width = 420,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width={width}
      footer={
        <>
          <Button onClick={onClose}>확인</Button>
        </>
      }
    >
      <Wrap>
        <Icon aria-hidden>⚠️</Icon>
        <Content>
          {message && <Msg>{message}</Msg>}
          {detail && <Detail>{detail}</Detail>}
        </Content>
      </Wrap>
    </Modal>
  );
}

const Wrap = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;
`;

const Icon = styled.div`
  font-size: 22px;
  line-height: 1;
  margin-top: 2px;
`;

const Content = styled.div`
  flex: 1;
  min-width: 0;
`;

const Msg = styled.div`
  color: #111827;
  font-size: 14px;
  line-height: 1.6;
  font-weight: 600;
  margin-bottom: 6px;
  word-break: break-word;
`;

const Detail = styled.pre`
  margin: 0;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  background: #fafafa;
  border-radius: 8px;
  color: #4b5563;
  font-size: 12px;
  line-height: 1.5;
  max-height: 200px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
`;
const Button = styled.button`
  height: 36px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid ${({ variant }) => (variant === "ghost" ? "#e5e7eb" : "#ff0000")};
  background: ${({ variant }) => (variant === "ghost" ? "#fff" : "#ff0000")};
  color: ${({ variant }) => (variant === "ghost" ? "#111827" : "#fff")};
  font-weight: 700;
  opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
`;