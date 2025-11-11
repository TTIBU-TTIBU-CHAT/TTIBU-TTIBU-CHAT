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
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`

export const ActionButtons = styled.div`
  display: flex;
  gap: 8px;

  button {
    padding: 6px 10px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    background: #eee;

    &:hover {
      background: #ddd;
    }
  }
`