import styled, { css } from "styled-components";

export const Item = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 20px 15px;
  border-bottom: 1px solid #e5e7eb;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background-color: #f3f4f6;
  }
`;

export const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
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
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin: 0;
`;

export const TagWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

export const Tag = styled.span`
  font-size: 12px;
  font-weight: 500;
  background: ${({ $extra }) => ($extra ? "#e2e8f0" : "#2f4a75")};
  color: ${({ $extra }) => ($extra ? "#334155" : "#fff")};
  padding: 3px 8px;
  border-radius: 8px;

  ${({ $extra }) =>
    $extra &&
    css`
      border: 1px solid #cbd5e1;
    `}
`;

/* ----- 오른쪽 영역 + 날짜 + 케밥 메뉴 ----- */
export const RightArea = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
`;

export const Date = styled.span`
  font-size: 13px;
  color: #64748b;
  min-width: 70px;
  text-align: right;
  white-space: nowrap;
`;

export const MenuWrap = styled.div`
  position: relative;
`;

export const KebabButton = styled.button`
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;

  &:hover {
    background: #edf2f7;
  }
`;

export const KebabDots = styled.div`
  display: grid;
  gap: 3px;
  & > span {
    width: 4px;
    height: 4px;
    background: #111827;
    border-radius: 9999px;
    display: block;
  }
`;

export const Menu = styled.div`
  position: absolute;
  top: 34px;
  right: 0;
  min-width: 140px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
  padding: 6px;
  z-index: 20;
`;

export const MenuItem = styled.button`
  width: 100%;
  text-align: left;
  height: 34px;
  padding: 0 10px;
  border: 0;
  border-radius: 8px;
  font-size: 13px;
  color: #111827;
  background: transparent;
  cursor: pointer;

  &:hover {
    background: #f3f4f6;
  }

  ${({ $danger }) =>
    $danger &&
    css`
      color: #b91c1c;
      &:hover {
        background: #fef2f2;
      }
    `}
`;
