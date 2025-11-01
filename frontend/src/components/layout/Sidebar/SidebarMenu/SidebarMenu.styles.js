import styled from 'styled-components'

export const MenuItem = styled.button`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: none;
  color: #374151;
  font-size: 0.95rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.25s ease, color 0.25s ease;
  overflow: hidden;

  &:hover {
    background: #eef1f5;
  }

  &:focus {
    outline: none;
    box-shadow: none;
  }

  .icon {
    width: 24px;
    min-width: 24px;
    flex-shrink: 0;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  span {
    display: inline-block;
    white-space: nowrap;
    overflow: hidden;
    color: inherit;
    margin-left: 10px;
    opacity: ${({ $collapsed }) => ($collapsed ? 0 : 1)};
    transition:
      width 0.35s cubic-bezier(0.4, 0, 0.2, 1),
      opacity 0.3s ease 0.05s;
  }
`

export const SubList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px 0;
  opacity: 0;
  animation: fadeIn 0.50s ease forwards;

  @keyframes fadeIn {
    to {
      opacity: 1;
    }
  }
`

export const SubItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  border-radius: 6px;
  padding: 4px 8px;

  &:hover {
    background-color: #eef2f7;
  }
`

export const SubText = styled.span`
  font-size: 13px;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const MoreButton = styled.button`
  margin-top: 4px;
  padding: 4px 6px;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  background: #f9fafb;
  font-size: 12px;
  cursor: pointer;

  &:hover {
    background: #eef2f7;
  }

  opacity: 0;
  animation: fadeIn 0.50s ease forwards;

  @keyframes fadeIn {
    to {
      opacity: 1;
    }
  }
`