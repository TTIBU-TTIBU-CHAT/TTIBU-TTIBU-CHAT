import styled, { css } from "styled-components";

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  justify-content: end;
  background: transparent;
  pointer-events: none;
`;

export const Panel = styled.section`
  --panel-w: 440px;
  --peek: 56px;

  position: relative;
  height: 100dvh;
  width: min(100%, var(--panel-w));
  background: #fff;
  border-left: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease-out;
  pointer-events: auto;

  ${({ $open, $peek }) =>
    $open
      ? css`
          transform: translateX(0);
        `
      : $peek
        ? css`
            transform: translateX(calc(100% - var(--peek)));
          `
        : css`
            transform: translateX(100%);
          `}
`;

export const Dock = styled.div`
  position: absolute;
  top: 5rem;
  left: -56px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  pointer-events: none;
`;

export const DockButton = styled.button`
  pointer-events: auto;
  height: 44px;
  width: 44px;
  border-radius: 50%;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: 0.2s ease;
  i {
    font-size: 18px;
    color: #374151;
  }
  &:hover {
    box-shadow: 0 16px 32px rgba(0, 0, 0, 0.16);
  }
  &:focus,
  &:focus-visible {
    outline: none;
    border: none;
    box-shadow: none;
  }
`;

export const Header = styled.header`
  position: relative;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 3px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
`;

/* 왼쪽 아이콘 고정 */
export const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
`;

/* 중앙 텍스트 절대 중앙 정렬 */
export const HeaderCenter = styled.div`
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  white-space: nowrap; /* 줄바꿈 방지 */
`;

/* 오른쪽 드롭다운 */
export const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  margin-left: auto;
`;

export const IconButton = styled.button`
  height: 32px;
  width: 32px;
  border-radius: 50%;
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover {
    background: rgba(0, 0, 0, 0.05);
  }
`;

export const Dropdown = styled.div`
  position: relative;
`;

export const DropdownToggler = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 8px;
  &:hover {
    background: rgba(0, 0, 0, 0.04);
  }
  &:focus,
  &:focus-visible {
    outline: none;
    border: none;
    box-shadow: none;
  }
`;

export const TogglerText = styled.span`
  font-size: 18px;
  font-weight: 600;
`;

export const TogglerTextMuted = styled.span`
  font-size: 14px;
  color: #6b7280;
`;

export const Chevron = styled.span`
  width: 16px;
  height: 16px;
  display: inline-block;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: rotate(45deg);
  transition: transform 0.2s ease;
  ${({ $open }) =>
    $open &&
    css`
      transform: rotate(225deg);
    `}
`;

export const DropdownList = styled.ul`
  position: absolute;
  top: calc(100% + 8px);
  ${({ $right }) =>
    $right
      ? css`
          right: 0;
        `
      : css`
          left: 0;
        `}
  width: 160px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  z-index: 100;
`;

export const DropdownItem = styled.li`
  padding: 8px 12px;
  font-size: 14px;
  color: ${({ $active }) => ($active ? "#111827" : "#374151")};
  background: ${({ $active }) =>
    $active ? "rgba(0, 0, 0, 0.04)" : "transparent"};
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  &:hover {
    background: rgba(0, 0, 0, 0.06);
  }
  font-weight: 600;
`;

export const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export const Bubble = styled.div`
  max-width: 85%;
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  background: ${({ $me }) => ($me ? "#fff" : "#f3f4f6")};
  color: ${({ $me }) => ($me ? "#111827" : "#374151")};
  box-shadow: ${({ $me }) => ($me ? "0 4px 8px rgba(0, 0, 0, 0.06)" : "none")};
  margin-left: ${({ $me }) => ($me ? "auto" : "0")};
`;

export const Footer = styled.footer`
  padding: 12px;
  align-content: center;
  height: 9.5%;
`;

export const InputWrap = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 9999px;
  padding: 8px 17px;
  padding-right: 52px; /* 버튼 자리 */
  height: 95%;
`;

export const Input = styled.input`
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  min-width: 0;
`;

export const SendButton = styled.button`
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;

  /* ✅ 컬러 시스템 */
  background: #406992;
  color: #ffffff;

  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);

  /* 활성(기본) 상태 */
  &:hover {
    filter: brightness(1.05);
  }
  &:active {
    transform: translateY(calc(-50% + 1px));
  }

  /* ✅ 비활성 상태 */
  ${({ $disabled }) =>
    $disabled &&
    css`
      opacity: 0.45; /* 연하게 */
      cursor: not-allowed;
      box-shadow: none;
      /* 호버/액티브 무효화 */
      &:hover {
        filter: none;
      }
      &:active {
        transform: translateY(-50%);
      }
    `}
`;
