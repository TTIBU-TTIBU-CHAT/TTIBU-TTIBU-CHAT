import styled, { css, keyframes } from "styled-components";

/* ===== 전환 애니메이션 ===== */
const slideInForward = keyframes`
  from { opacity: 0; transform: translateX(20px); }
  to   { opacity: 1; transform: translateX(0); }
`;
const slideInBackward = keyframes`
  from { opacity: 0; transform: translateX(-20px); }
  to   { opacity: 1; transform: translateX(0); }
`;
const slideOutForward = keyframes`
  from { opacity: 1; transform: translateX(0); }
  to   { opacity: 0; transform: translateX(-20px); }
`;
const slideOutBackward = keyframes`
  from { opacity: 1; transform: translateX(0); }
  to   { opacity: 0; transform: translateX(20px); }
`;

/* ===== Overlay & Panel ===== */
export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 10;
  display: flex;
  justify-content: end;
  /* ✅ 전체화면일 때만 배경을 살짝 어둡게 */
  pointer-events: none;
`;

export const Panel = styled.section`
  --panel-w: 440px;
  --peek: 56px;

  position: relative;
  height: 100dvh;

  /* ✅ 전체 화면 모드일 땐 폭을 100vw로 */
  width: ${({ $fullscreen }) =>
    $fullscreen ? "calc(100vw - 70px)" : "min(100%, var(--panel-w))"};

  background: #fff;

  /* ✅ 전체 화면에선 좌측 테두리/그림자 제거 */
  border-left: ${({ $fullscreen }) =>
    $fullscreen ? "none" : "1px solid rgba(0,0,0,0.05)"};
  box-shadow: ${({ $fullscreen }) =>
    $fullscreen ? "none" : "0 20px 40px rgba(0,0,0,0.15)"};

  display: flex;
  flex-direction: column;
  pointer-events: auto;

  /* 폭 전환도 부드럽게 */
  transition:
    transform 0.3s ease-out,
    width 0.35s ease-in-out,
    box-shadow 0.35s ease-in-out,
    border-left 0.35s ease-in-out;

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
/* ===== Dock ===== */
export const Dock = styled.div`
  position: absolute;
  top: 5rem;
  left: -56px;

  display: ${({ $fullscreen }) => ($fullscreen ? "none" : "flex")};
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
    box-shadow: none;
    border-color: rgba(0, 0, 0, 0.08);
  }
`;

/* ===== Header ===== */
export const Header = styled.header`
  position: relative;
  height: 56px;
  z-index: 2;
`;

export const HeaderLayer = styled.div`
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 4px;
  padding: 0 12px;

  animation: ${({ $phase, $dir }) => {
      if ($phase === "enter")
        return $dir === "backward" ? slideInBackward : slideInForward;
      return $dir === "backward" ? slideOutForward : slideOutBackward;
    }}
    240ms ease both;
`;

export const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  justify-self: start;
`;
export const HeaderCenter = styled.div`
  justify-self: center;
  position: relative;
  white-space: nowrap;
`;
export const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  justify-self: end;
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
  &:focus,
  &:focus-visible {
    outline: none;
    box-shadow: none;
  }
`;

/* ===== Dropdowns ===== */
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
    box-shadow: none;
  }
`;

export const TogglerText = styled.span`
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
`;

export const TogglerTextMuted = styled.span`
  font-size: 14px;
  color: #6b7280;
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
  z-index: 2000;
`;

export const DropdownItem = styled.li`
  padding: 8px 12px;
  font-size: 14px;
  color: ${({ $active }) => ($active ? "#111827" : "#374151")};
  background: ${({ $active }) =>
    $active ? "rgba(0,0,0,0.04)" : "transparent"};
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  font-weight: 600;
  &:hover {
    background: rgba(0, 0, 0, 0.06);
  }
`;

/* ===== Body & Content 전환 컨테이너 ===== */
export const Body = styled.div`
  flex: 1;
  position: relative;
  overflow: hidden;
  z-index: 1;
`;

export const ContentLayer = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;

  animation: ${({ $phase, $dir }) => {
      if ($phase === "enter")
        return $dir === "backward" ? slideInBackward : slideInForward;
      return $dir === "backward" ? slideOutForward : slideOutBackward;
    }}
    260ms ease both;
`;

/* ===== Chat 전용 ===== */
export const ChatScroll = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export const Bubble = styled.div`
  max-width: 85%;
  padding: 12px 14px;
  font-size: 16px;
  border-radius: 16px;
  background: ${({ $me }) => ($me ? "#fff" : "#F1F4F8")};
  color: ${({ $me }) => ($me ? "#111827" : "#374151")};
  box-shadow: ${({ $me }) => ($me ? "0 4px 8px rgba(0,0,0,0.06)" : "none")};
  margin-left: ${({ $me }) => ($me ? "auto" : "0")};
`;

/* 말풍선 하단 모델 태그 */
export const ModelTag = styled.div`
  margin: 6px 0 2px;
  font-size: 12px;
  color: #9aa4b2;
  text-align: right;
  padding-right: 6px;
`;

/* ===== Footer & Input ===== */
export const Footer = styled.footer`
  padding: 12px;
  align-content: center;
`;
export const InputWrap = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 9999px;
  padding: 8px 17px;
  padding-right: 52px;
`;
export const Input = styled.input`
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  min-width: 0;
  &:focus,
  &:focus-visible {
    outline: none;
    box-shadow: none;
  }
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
  background: #406992;
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
  &:hover {
    filter: brightness(1.05);
  }
  &:active {
    transform: translateY(calc(-50% + 1px));
  }
  ${({ $disabled }) =>
    $disabled &&
    css`
      opacity: 0.45;
      cursor: not-allowed;
      box-shadow: none;
      &:hover {
        filter: none;
      }
      &:active {
        transform: translateY(-50%);
      }
    `}
`;

/* 단순 타이틀 */
export const SearchTitle = styled.span`
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
`;

/* ==================== 검색 전용 스타일 ==================== */
export const SearchBarWrap = styled.div`
  position: sticky;
  top: 0;
  z-index: 3;
  background: #fff;
  padding: 10px 12px 6px;
  display: flex;
  gap: 8px;
  align-items: center;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
`;

export const SearchField = styled.input`
  flex: 1;
  height: 40px;
  border-radius: 9999px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: #fff;
  padding: 0 16px;
  font-size: 14px;
  outline: none;

  &::placeholder {
    color: #9ca3af;
  }

  &:focus,
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(64, 105, 146, 0.12);
    border-color: rgba(64, 105, 146, 0.45);
  }
`;

export const SearchIconBtn = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: #111827;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  i {
    font-size: 16px;
  }
  &:hover {
    filter: brightness(1.05);
  }
  &:active {
    transform: translateY(1px);
  }
  &:focus,
  &:focus-visible {
    outline: none;
    box-shadow: none;
  }
`;

export const ChipRow = styled.div`
  padding: 8px 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

export const Chip = styled.span`
  height: 28px;
  padding: 0 10px 0 12px;
  border-radius: 9999px;
  background: #eef2f7;
  color: #1f2937;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 8px;

  button {
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    color: #6b7280;
    padding: 0;
    &:hover {
      color: #111827;
    }
  }
`;

export const SearchScroll = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.15);
    border-radius: 9999px;
  }
  &::-webkit-scrollbar-button {
    display: none;
    height: 0;
    width: 0;
  }
`;

export const ResultCard = styled.article`
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.06);
  padding: 14px 14px 12px;
  cursor: pointer;
  transition:
    transform 0.45s cubic-bezier(0.22, 1, 0.36, 1),
    border 0.3s ease,
    box-shadow 0.45s ease;

  &:hover {
    transform: translateY(-6px);
    border: 3px solid #406992;
    box-shadow: 0 14px 32px rgba(64, 105, 146, 0.25);
  }
  &:active {
    transform: translateY(-2px);
    transition-duration: 0.15s;
  }
`;

export const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const Badge = styled.span`
  --bg: ${({ tone }) => (tone === "blue" ? "#5DA2D7" : "#6b7280")};
  --fg: #fff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.3px;
  padding: 4px 8px;
  border-radius: 9999px;
  background: var(--bg);
  color: var(--fg);
`;

export const MetaDate = styled.span`
  font-size: 11px;
  color: #9ca3af;
`;

export const CardTitle = styled.h3`
  margin: 10px 0 2px;
  font-size: 15px;
  color: #1f2937;
`;

export const CardDivider = styled.hr`
  border: none;
  height: 1px;
  background: rgba(0, 0, 0, 0.08);
  margin: 8px 0 6px;
`;

export const CardExcerpt = styled.p`
  margin: 4px 0 10px;
  font-size: 13px;
  color: #374151;
`;

export const TagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

export const TagPill = styled.span`
  height: 28px;
  min-width: 48px;
  padding: 0 12px;
  border-radius: 9999px;
  background: #eef2f7;
  color: #374151;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;
export const GroupTagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content:right;
  gap: 6px;
  padding: 4px 2px 8px;
  font-size: 12px;
`;

export const GroupTag = styled.span`
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.16);
  color: #64748b;
  font-weight: 500;
  line-height: 1.4;
`;
