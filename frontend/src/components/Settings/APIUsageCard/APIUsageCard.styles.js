import styled from 'styled-components'

export const Card = styled.div`
  flex: 1;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  padding: 24px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`

export const Title = styled.h2`
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
`

export const CircleWrapper = styled.div`
  display: flex;
  justify-content: center;
  margin: 16px 0;
`

export const Circle = styled.div`
  width: 160px;
  height: 160px;
  border-radius: 50%;
  background: #2f4a75;
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`

export const TokenCount = styled.span`
  font-size: 32px;
  font-weight: 700;
`

export const TokenLabel = styled.span`
  font-size: 14px;
  opacity: 0.9;
`

export const List = styled.ul`
  list-style: none;
  padding: 0;
  margin-top: 12px;
`

export const ListItem = styled.li`
  font-size: 14px;
  color: #555;
  margin-bottom: 4px;
`

export const InfoBox = styled.div`
  font-size: 12px;
  color: #999;
  margin-top: 16px;
  border-top: 1px solid #eee;
  padding-top: 8px;
`
