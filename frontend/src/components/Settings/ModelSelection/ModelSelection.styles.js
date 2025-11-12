import styled, { css } from 'styled-components'

export const Card = styled.div`
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
  margin-bottom: 20px;
`

export const Title = styled.h2`
  font-size: 18px;
  font-weight: 600;
`

export const ToggleWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666;
`

export const Toggle = styled.input`
  cursor: pointer;
`

export const Tabs = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
`

export const Tab = styled.button`
  background: ${({ $active }) => ($active ? '#f9fafb' : '#f3f4f6')};
  border: ${({ $active }) =>
    $active ? '2px solid #2f4a75' : '1px solid #e5e7eb'};
  color: ${({ $active }) => ($active ? '#2f4a75' : '#9ca3af')};
  font-weight: 600;
  border-radius: 8px;
  padding: 8px 16px;
  cursor: pointer;
`

export const ModelGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
`

export const ModelCard = styled.div`
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  background: #f9fafb;
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  }

  ${({ $selected }) =>
    $selected &&
    css`
      border-color: #2f4a75;
      background: #eef2fa;
      color: #1e3a8a;
    `}

  ${({ $isDefault }) =>
    $isDefault &&
    css`
      border-color: #9ca3af;
      background: #f3f4f6;
      color: #4b5563;
    `}
`

export const ModelTitle = styled.h3`
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
`

export const DefaultBadge = styled.span`
  background: #9ca3af;
  color: white;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 6px;
  font-weight: 600;
`

export const ModelDesc = styled.p`
  font-size: 13px;
  color: #666;
`

export const SaveButton = styled.button`
  align-self: flex-end;
  background: #2f4a75;
  color: white;
  border: none;
  padding: 10px 18px;
  border-radius: 8px;
  margin-top: 24px;
  cursor: pointer;

  &:hover {
    background: #3a598a;
  }
`
