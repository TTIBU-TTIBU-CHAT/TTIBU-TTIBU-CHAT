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
    width: ${({ $collapsed }) => ($collapsed ? '0px' : '120px')};
    opacity: ${({ $collapsed }) => ($collapsed ? 0 : 1)};
    transition:
      width 0.35s cubic-bezier(0.4, 0, 0.2, 1),
      opacity 0.3s ease 0.05s;
  }
`