import React, { useEffect, useRef } from "react";
import styled from "styled-components";

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer, // e.g., <><Button/> <Button/></>
  width = 520,
  closeOnBackdrop = true,
}) {
  const cardRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      // 포커스 트랩 시작점
      setTimeout(() => cardRef.current?.focus(), 0);
    }
  }, [open]);

  if (!open) return null;

  return (
    <Backdrop onClick={closeOnBackdrop ? onClose : undefined}>
      <Card
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
        $width={width}
      >
        {title && <Title>{title}</Title>}
        <Body>{children}</Body>
        {footer && <Footer>{footer}</Footer>}
      </Card>
    </Backdrop>
  );
}

/* styled */
const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.35);
  display: grid;
  place-items: center;
  z-index: 50;
`;
const Card = styled.div`
  width: min(${(p) => p.$width}px, 92vw);
  background: #fff;
  border-radius: 16px;
  padding: 20px 18px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  outline: none;
`;
const Title = styled.h3`
  margin: 0 0 12px;
  font-size: 18px;
  font-weight: 800;
`;
const Body = styled.div``;
const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 14px;
`;

/* 유틸 버튼 */
export const ModalButton = styled.button`
  height: 36px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid ${({ variant }) => (variant === "ghost" ? "#e5e7eb" : "#2d9364")};
  background: ${({ variant }) => (variant === "ghost" ? "#fff" : "#2d9364")};
  color: ${({ variant }) => (variant === "ghost" ? "#111827" : "#fff")};
  font-weight: 700;
  opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
`;
