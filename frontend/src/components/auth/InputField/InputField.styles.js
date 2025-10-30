import styled from 'styled-components'

export const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.80rem;
  box-sizing: border-box;
  &:focus {
    border-color: #4a5b7a;
    box-shadow: 0 0 0 2px rgba(74,91,122,0.2);
  }
`;
