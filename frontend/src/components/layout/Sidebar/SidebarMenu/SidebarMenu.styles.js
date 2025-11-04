import styled, { css } from 'styled-components'

export const MenuItem = styled.button`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: none;
  color: #454746;
  font-size: 0.95rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.25s ease;
  overflow: hidden;
  position: relative;

  &:hover {
    background-color: #f3f4f6;
    color: #406992;

    .icon {
      color: #406992;
    }
  }

  &:focus {
    outline: none;
    box-shadow: none;
  }

  .icon {
    width: 24px;
    min-width: 24px;
    flex-shrink: 0;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    color: inherit;
    transition: color 0.25s ease;
  }

  span {
    display: inline-block;
    white-space: nowrap;
    overflow: hidden;
    color: inherit;
    font-size: 13px;
    font-weight: 600;
    margin-left: 10px;
    opacity: ${({ $collapsed }) => ($collapsed ? 0 : 1)};
    transition:
      width 0.35s cubic-bezier(0.4, 0, 0.2, 1),
      opacity 0.3s ease 0.05s;
  }

  ${({ $active }) =>
    $active &&
    css`
      background-color: #f3f4f6;
      color: #406992;
      font-weight: 600;

      .icon {
        color: #406992;
      }
    `}
`

export const SubList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px 0;
  opacity: 0;
  animation: fadeIn 0.5s ease forwards;

  @keyframes fadeIn {
    to {
      opacity: 1;
    }
  }
`

export const SubItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 13px;
  font-weight: 500;

  &:hover {
    background-color: #f3f4f6;
  }

  opacity: 0;
  animation: fadeIn 0.5s ease forwards;

  @keyframes fadeIn {
    to {
      opacity: 1;
    }
  }
`

export const SubText = styled.span`
  font-size: 13px;
  color: #454746;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const MoreButton = styled.button`
  margin-top: 4px;
  padding: 4px 6px;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  background: #f9fafb;
  font-size: 12px;
  cursor: pointer;

  &:hover {
    background: #eef2f7;
  }

  &:focus {
    outline: none;
    box-shadow: none;
  }

  opacity: 0;
  animation: fadeIn 0.5s ease forwards;

  @keyframes fadeIn {
    to {
      opacity: 1;
    }
  }
`