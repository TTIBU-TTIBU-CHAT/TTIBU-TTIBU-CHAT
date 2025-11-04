import styled, { css, keyframes } from 'styled-components'

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`

export const Toast = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 12px 18px;
  border-radius: 8px;
  color: white;
  font-weight: 500;
  animation: ${fadeInUp} 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);

  ${({ $type }) =>
    $type === 'loading'
      ? css`
          background: #6b7280;
        `
      : $type === 'success'
      ? css`
          background: #16a34a;
        `
      : css`
          background: #dc2626;
        `}
`
