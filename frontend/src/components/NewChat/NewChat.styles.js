import styled, { css } from "styled-components";

export const Container = styled.div`
  flex: 1;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #fff;
  box-sizing: border-box;
  overflow: hidden;
  min-width: 600px;
`;

export const CenterBox = styled.div`
  position: relative;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
`;

export const SelectedRow = styled.div`
  position: absolute;
  bottom: 100%;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;

  width: 80vw;
  max-width: 800px;
  min-width: 360px;
  margin: 0 auto;
  margin-bottom: 12px;

  max-height: 150px;
  padding: 12px 10px;
  overflow-y: auto;
  overflow-x: hidden;
  background: #f8f9fb;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.15);
    border-radius: 3px;
  }
`;

export const SelectedTag = styled.div`
  display: flex;
  align-items: center;
  border-radius: 20px;
  padding: 6px 12px;
  font-size: 14px;
  font-weight: 500;
  background-color: ${({ $type }) =>
    $type === "group" ? "#F3ECFF" : "#E9F2FF"};
  color: ${({ $type }) => ($type === "group" ? "#6D4CC2" : "#2B6CB0")};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  animation: fadeIn 0.25s ease;
  white-space: nowrap;
  overflow: visible;

  button {
    border: none;
    background: transparent;
    color: #888;
    font-size: 14px;
    margin-left: 6px;
    cursor: pointer;

    &:hover {
      color: #111;
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

export const Input = styled.input`
  width: 480px;
  padding: 12px 18px;
  border-radius: 20px;
  border: 1px solid #e5e7eb;
  font-size: 16px;
  outline: none;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);

  &:focus {
    border-color: #6b5dd3;
  }
`;
export const InputWrap = styled.div`
  position: relative;
  display: inline-block;
`;
export const ButtonRow = styled.div`
  display: flex;
  justify-content: center;
  gap: 12px;
`;

export const SelectButton = styled.button`
  padding: 10px 20px;
  font-size: 15px;
  font-weight: 600;
  border-radius: 10px;
  cursor: pointer;
  border: none;
  background-color: ${({ $active }) => ($active ? "#406992" : "#f3f4f6")};
  color: ${({ $active }) => ($active ? "#fff" : "#111")};
  transition: all 0.2s ease;

  &:hover {
    opacity: 0.9;
    background-color: #406992;
    color: #fff;
  }

  &:focus {
    outline: none;
    box-shadow: none;
  }
`;
export const SendButton = styled.button`
  position: absolute;
  right: 6px;
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
  transition:
    filter 120ms ease,
    transform 80ms ease;

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
export const TopLeftBar = styled.div`
  position: absolute;
  top: 16px;
  left: 24px;
  z-index: 10;
`;
/* 드롭다운 위치 및 스타일 추가 */
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

export const TogglerTextMuted = styled.span`
  font-size: 14px;
  color: #6b7280;
`;

export const DropdownList = styled.ul`
  position: absolute;
  top: calc(100% + 8px);

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
