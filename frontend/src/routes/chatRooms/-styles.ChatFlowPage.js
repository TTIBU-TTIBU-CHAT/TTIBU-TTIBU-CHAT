import styled from "styled-components";

export const Page = styled.div`
  position: relative;
  min-height: 100dvh;
`;

export const TopCenterActionBar = styled.div`
  position: absolute;
  top: 48px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 4;
`;

export const GroupChip = styled.button`
  height: 30px;
  padding: 0 14px;
  border: 1px solid #bfead0;
  background: #e9f7f0;
  color: #2d9364;
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 800;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.06);
  cursor: pointer;
`;
