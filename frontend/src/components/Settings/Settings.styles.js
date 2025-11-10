import styled from 'styled-components'

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  background: #f9fafc;
  min-height: 100vh;
  box-sizing: border-box;
`

export const Layout = styled.div`
  display: flex;
  width: 100%;
  height: 100vh;
  background: #f9fafc;
`

export const Content = styled.div`
  flex: 1;
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  overflow-y: auto;
  transition: margin-left 0.35s cubic-bezier(0.4, 0, 0.2, 1);
`
export const TopRow = styled.div`
  display: flex;
  gap: 20px;
  align-items: stretch;
  justify-content: space-between;
`
