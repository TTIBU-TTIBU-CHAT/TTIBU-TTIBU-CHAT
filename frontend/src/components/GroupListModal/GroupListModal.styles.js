import styled from 'styled-components'

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 50;
`

export const Modal = styled.div`
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  width: 400px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
`

export const Title = styled.h2`
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 20px;
`

export const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 6px;
`

export const Input = styled.input`
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
  margin-bottom: 16px;
  font-size: 14px;
`

export const Button = styled.button`
  width: 100%;
  padding: 10px;
  background: #007bff;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  margin-bottom: 10px;

  &:hover {
    background: #0056b3;
  }
`

export const Cancel = styled.button`
  width: 100%;
  padding: 10px;
  background: #eee;
  color: #333;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;

  &:hover {
    background: #ddd;
  }
`
