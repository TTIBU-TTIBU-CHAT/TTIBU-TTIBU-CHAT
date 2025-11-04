import styled from 'styled-components'

export const Card = styled.div`
  flex: 1;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  padding: 24px;
  display: flex;
  flex-direction: column;
`

export const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`

export const Title = styled.h2`
  font-size: 18px;
  font-weight: 600;
`

export const AddButton = styled.button`
  background: #2f4a75;
  color: #fff;
  border: none;
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;

  &:hover {
    background: #3a598a;
  }
`

export const KeyList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const KeyItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 10px 14px;
  color: #374151;
`

export const StatusLabel = styled.span`
  font-size: 13px;
  padding: 3px 10px;
  border-radius: 6px;
  background-color: ${({ $status }) =>
    $status === '활성'
      ? '#DCFCE7'
      : $status === '비활성'
      ? '#F3F4F6'
      : '#F9FAFB'};
  color: ${({ $status }) =>
    $status === '활성'
      ? '#16A34A'
      : $status === '비활성'
      ? '#9CA3AF'
      : '#D1D5DB'};
`
