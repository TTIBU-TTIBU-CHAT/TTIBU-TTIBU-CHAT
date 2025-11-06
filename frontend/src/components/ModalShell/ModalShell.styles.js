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

/* ===== Dock ===== */
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
    box-shadow: none;
    border-color: rgba(0, 0, 0, 0.08);
  }
`;

/* ===== Header (오버플로우 제거 + z-index ↑) ===== */
export const Header = styled.header`
  position: relative;
  height: 56px;

  z-index: 2; /* 본문보다 위 */
  /* overflow: hidden;  제거: 드롭다운이 헤더 밖으로 나올 수 있게 */
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

/* 슬롯 */
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
  z-index: 2000; /* 본문 위 */
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
  overflow: hidden; /* 콘텐츠 전환 레이어 클리핑 */
  z-index: 1; /* 헤더보다 낮게 */
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

/* ===== Chat 전용 스크롤 ===== */
export const ChatScroll = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px 16px 16px; /* 헤더와 여백 + 버블 간격 */
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

/* ===== 채팅 말풍선 ===== */
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
export const ModelTag = styled.div`
  margin-top: 4px;
  margin-left: ${({ $me }) => ($me ? "auto" : "8px")};
  max-width: 85%;
  font-size: 12px;
  color: #9ca3af;
  text-align: ${({ $me }) => ($me ? "left" : "right")};
  padding-right:10px;
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

/* ===== 단순 타이틀 ===== */
export const SearchTitle = styled.span`
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
`;

/* ==================== 검색 전용 스타일 ==================== */

/* 상단 검색바 래퍼 */
export const SearchBarWrap = styled.div`
  position: sticky;
  top: 0;
  z-index: 3; /* 드롭다운/본문 위 */
  background: #fff;
  padding: 10px 12px 6px;
  display: flex;
  gap: 8px;
  align-items: center;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
`;

/* 검색 입력 */
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

/* 검색 아이콘 버튼 */
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

/* 선택 칩 영역 */
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

/* 검색 스크롤(카드 리스트) */
export const SearchScroll = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  /* ✅ 스크롤바 전체 스타일 (웹킷 계열 브라우저) */
  &::-webkit-scrollbar {
    width: 8px; /* 얇게 */
  }

  /* 스크롤바 트랙 */
  &::-webkit-scrollbar-track {
    background: transparent; /* 트랙 배경 투명 */
  }

  /* 스크롤바 손잡이 */
  &::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.15);
    border-radius: 9999px;
  }

  /* ✅ 스크롤 상/하 버튼 제거 */
  &::-webkit-scrollbar-button {
    display: none;
    height: 0;
    width: 0;
  }
`;

/* 결과 카드 */
export const ResultCard = styled.article`
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.06);
  padding: 14px 14px 12px;
  cursor: pointer;
  &:hover {
    transform: translateY(-5px);
    border: 3px solid #406992;
    box-shadow: 0 12px 28px rgba(64, 105, 146, 0.25);
  }

  /* 💫 천천히 뜨는 애니메이션 (easing 감속曲선) */
  transition:
    transform 0.45s cubic-bezier(0.22, 1, 0.36, 1),
    border 0.3s ease,
    box-shadow 0.45s ease;

  &:hover {
    transform: translateY(-6px); /* 좀 더 크게 떠오름 */
    border: 3px solid #406992;
    box-shadow: 0 14px 32px rgba(64, 105, 146, 0.25);
  }

  &:active {
    transform: translateY(-2px);
    transition-duration: 0.15s; /* 클릭 시는 빠르게 복귀 */
  }
`;

/* 카드 상단 라인 (배지 + 날짜) */
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

/* 태그 라인 */
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
