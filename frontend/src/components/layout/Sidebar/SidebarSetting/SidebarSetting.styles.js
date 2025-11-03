import styled, { css } from 'styled-components'

export const SettingButton = styled.button`
  background: none;
  border: none;
  outline: none;
  cursor: pointer;
  color: #454746;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease, background-color 0.2s ease, transform 0.15s ease;
  border-radius: 8px;
  position: relative;

  &:hover {
    color: #406992;
    background: #f3f4f6;
  }

  &:focus {
    outline: none;
    box-shadow: none;
  }

  ${({ $active }) =>
    $active &&
    css`
    color: #406992;
    background: #f3f4f6;

      &:hover {
        color: #406992;
        background: #f3f4f6;
        transform: scale(1.05);
      }
    `}
`
