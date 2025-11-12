import styled from 'styled-components'

export const Container = styled.div`
  padding: 36px 48px;
  background: #fff;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`

export const Title = styled.h2`
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 24px;
`

export const CreateButton = styled.button`
  padding: 10px 14px;
  background: #28a745;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 16px;

  &:hover {
    background: #218838;
  }
`

export const GroupItem = styled.div`
  margin-bottom: 8px;
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 8px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px 12px;
  background: #fff;
  transition: box-shadow 0.2s ease;
  overflow: hidden;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  min-width: 0;
`;

export const ActionButtons = styled.div`
  display: flex;
  gap: 6px;
  flex-shrink: 0;
  align-items: center;
  padding: 20px 15px;

  button {
    padding: 6px 10px;
    font-size: 13px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    background: #f1f5f9;

    &:hover {
      background: #e2e8f0;
    }
  }
`;
