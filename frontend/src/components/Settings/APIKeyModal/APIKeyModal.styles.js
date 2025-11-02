import styled, { css } from 'styled-components'

export const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`

export const Modal = styled.div`
  background: white;
  border-radius: 12px;
  width: 420px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
`

export const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0px;
  border-bottom: 1px solid #e5e7eb;
`

export const Title = styled.h2`
  font-size: 16px;
  font-weight: 600;
  margin-left: 20px;
`

export const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 22px;
  cursor: pointer;
  line-height: 1;
`

export const Body = styled.div`
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
`

export const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 14px;
    color: #444;
  }
`

export const Input = styled.input`
  padding: 8px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  outline: none;

  &:focus {
    border-color: #2f4a75;
  }
`

export const StatusGroup = styled.div`
  display: flex;
  gap: 8px;
`

export const StatusButton = styled.button`
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #f9fafb;
  padding: 6px 14px;
  cursor: pointer;
  font-size: 14px;
  ${({ $active }) =>
    $active &&
    css`
      background: #2f4a75;
      color: white;
      border-color: #2f4a75;
    `}
`

export const Footer = styled.div`
  border-top: 1px solid #e5e7eb;
  padding: 14px 20px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
`

export const ApplyButton = styled.button`
  background: #2f4a75;
  color: white;
  border: none;
  padding: 8px 18px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s ease;
  &:hover {
    background: #3a598a;
  }
`

export const DeleteButton = styled(ApplyButton)`
  background: #dc2626;
  &:hover {
    background: #b91c1c;
  }
`
