import styled from 'styled-components'

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  box-sizing: border-box;
`

export const Title = styled.h2`
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 16px;
  color: #2d2d2d;
  text-align: center;
`

export const BackLink = styled.a`
  display: block;
  margin-top: 16px;
  text-align: right;
  font-size: 0.85rem;
  color: #6b7280;
  text-decoration: none;
  transition: color 0.2s;
  &:hover {
    color: #4a5b7a;
    text-decoration: underline;
  }
`
