import React from "react";
import styled from "styled-components";
import Modal, { ModalButton } from "./Modal";

export default function InputDialog({
  open,
  title = "입력",
  placeholder = "",
  value,
  setValue,
  onCancel,
  onConfirm,
  width = 520,
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      width={width}
      footer={
        <>
          <ModalButton onClick={onCancel} variant="ghost">취소</ModalButton>
          <ModalButton onClick={onConfirm} disabled={!value?.trim?.()}>확인</ModalButton>
        </>
      }
    >
      <Input
        autoFocus
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onConfirm();
          if (e.key === "Escape") onCancel();
        }}
      />
    </Modal>
  );
}

const Input = styled.input`
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  outline: none;
  font-size: 14px;
  &:focus {
    border-color: #2d9364;
    box-shadow: 0 0 0 3px rgba(45,147,100,.15);
  }
`;
