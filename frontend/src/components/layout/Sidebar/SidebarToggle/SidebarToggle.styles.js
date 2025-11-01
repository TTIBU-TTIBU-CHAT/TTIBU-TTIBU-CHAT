import styled from 'styled-components'

export const ToggleButton = styled.button`
  background: none;
  border: none;
  outline: none;
  cursor: pointer;
  color: #374151;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;

  &:hover {
    color: #3b82f6;
  }
  &:focus {
    outline: none;
    box-shadow: none;
  }
`
