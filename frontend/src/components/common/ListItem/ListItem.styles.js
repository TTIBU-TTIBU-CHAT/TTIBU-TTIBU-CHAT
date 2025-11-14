import styled, { css } from "styled-components";

export const Item = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  padding: 16px 14px;          /* 살짝 더 컴팩트 */
  border-bottom: 1px solid #e5e7eb;
  cursor: pointer;
  transition: background 0.2s ease;
  min-width: 0;

  &:hover { background-color: #f8fafc; }
`;

export const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  flex: 1;
`;

export const Title = styled.h3`
  font-size: 17px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
  word-break: break-word;
`;

export const Summary = styled.p`
  font-size: 14px;
  color: #475569;
  margin: 0;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
`;

export const TagWrapper = styled.div`
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  min-width: 0;
  overflow: hidden;
  mask-image: linear-gradient(to right, black 80%, transparent 100%);
`;

export const Tag = styled.span`
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 500;
  background: ${({ $extra }) => ($extra ? "#e2e8f0" : "#2f4a75")};
  color: ${({ $extra }) => ($extra ? "#334155" : "#fff")};
  padding: 3px 8px;
  border-radius: 8px;
  white-space: nowrap;
`;

/* ----- 오른쪽 얇게 & 오른쪽 끝 정렬 ----- */
export const RightArea = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;                   /* 더 타이트 */
  margin-left: auto;          /* 오른쪽 끝으로 밀착 */
  min-width: 0;
`;

export const Date = styled.span`
  font-size: 13px;
  color: #64748b;
  text-align: right;
  white-space: nowrap;
`;

/* ----- 케밥 + 메뉴 ----- */
export const MenuWrap = styled.div`
  position: relative;
  display: inline-flex;
`;

export const KebabButton = styled.button`
  width: 26px;                /* 얇은 버튼 */
  height: 26px;
  padding: 0;
  border: none;               /* ✅ 보더 제거 */
  background: transparent;    /* 투명 배경 */
  display: grid;
  place-items: center;
  border-radius: 8px;
  cursor: pointer;

  /* hover 시 최소한의 피드백만 */
  &:hover { background: rgba(15, 23, 42, 0.06); }
  &:active { background: rgba(15, 23, 42, 0.10); }

  /* 키보드 접근성 */
  &:focus-visible {
    outline: 2px solid rgba(59,130,246,.5);
    outline-offset: 2px;
  }
`;

export const KebabDots = styled.div`
  display: grid;
  gap: 3px;
  & > span {
    width: 3px;               /* 더 얇은 점 */
    height: 3px;
    background: #0f172a;
    border-radius: 9999px;
    display: block;
  }
`;

export const Menu = styled.div`
  position: absolute;
  top: 30px;
  right: 0;
  min-width: 132px;
  background: #fff;
  /* ✅ 보더 제거 */
  border: none;
  border-radius: 10px;
  box-shadow: 0 8px 22px rgba(2, 6, 23, 0.14); /* 얇은 그림자 */
  padding: 4px;                                 /* 얇은 패딩 */
  z-index: 20;
`;

export const MenuItem = styled.button`
  width: 100%;
  text-align: left;
  height: 32px;               /* 더 컴팩트 */
  padding: 0 10px;
  border: 0;
  border-radius: 8px;
  font-size: 13px;
  color: #111827;
  background: transparent;
  cursor: pointer;

  &:hover { background: #f3f4f6; }

  ${({ $danger }) =>
    $danger &&
    css`
      color: #b91c1c;
      &:hover { background: #fef2f2; }
    `}
`;
