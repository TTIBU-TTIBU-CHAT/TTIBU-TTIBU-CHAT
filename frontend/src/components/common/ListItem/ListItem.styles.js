import styled, { css } from 'styled-components'

export const Item = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 0;
  border-bottom: 1px solid #e5e7eb;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background-color: #f3f4f6;
  }
`

export const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 85%;
`

export const Title = styled.h3`
  font-size: 17px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
`

export const Summary = styled.p`
  font-size: 14px;
  color: #475569;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin: 0;
`

export const TagWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

export const Tag = styled.span`
  font-size: 12px;
  font-weight: 500;
  background: ${({ $extra }) => ($extra ? '#e2e8f0' : '#2f4a75')};
  color: ${({ $extra }) => ($extra ? '#334155' : '#fff')};
  padding: 3px 8px;
  border-radius: 8px;
  ${({ $extra }) =>
    $extra &&
    css`
      border: 1px solid #cbd5e1;
    `}
`

export const Date = styled.span`
  font-size: 13px;
  color: #64748b;
  min-width: 70px;
  text-align: right;
`
