import styled from "styled-components";

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
