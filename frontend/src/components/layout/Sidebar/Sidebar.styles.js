import styled from 'styled-components'

export const Container = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  background-color: #f7f9fc;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-start;
  padding: 12px;
  box-sizing: border-box;
  transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;

  width: ${({ $collapsed }) => ($collapsed ? '70px' : '240px')};
  will-change: width;
`

export const Middle = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 20px;
  width: 100%;
`

export const Section = styled.div`
  display: flex;
  align-items: center;
  padding: 8px 0;
  cursor: pointer;
  border-radius: 8px;
  transition: background-color 0.2s ease;

  width: 100%;
  justify-content: space-between;
  .icon {
    width: 24px;
    min-width: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: #374151;
  }

  span {
    display: inline-block;
    white-space: nowrap;
    overflow: hidden;
    margin-left: 10px;
    color: #374151;
    width: ${({ $collapsed }) => ($collapsed ? '0px' : '120px')};
    opacity: ${({ $collapsed }) => ($collapsed ? 0 : 1)};
    transition:
      width 0.35s cubic-bezier(0.4, 0, 0.2, 1),
      opacity 0.25s ease 0.05s;
  }
`

export const Text = styled.a`
  color: #374151;
  margin-right: 10px;
  font-size: 12px;
  opacity: 0;
  animation: fadeIn 1.0s ease forwards;

  @keyframes fadeIn {
    to {
      opacity: 1;
    }
  }
`