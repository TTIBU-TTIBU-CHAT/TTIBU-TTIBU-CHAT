import styled from 'styled-components'

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
`

export const Title = styled.h2`
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 16px;
  color: #2d2d2d;
`

export const SecondaryButton = styled.button`
  width: fit-content;
  padding: 10px 20px; 
  background-color: #4a5b7a;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: 0.2s ease;
  &:hover {
    background-color: #3d4d6b;
  }
`

export const ErrorMessage = styled.p`
  color: #e74c3c;
  font-size: 0.9rem;
  margin: 4px 0 8px;
`