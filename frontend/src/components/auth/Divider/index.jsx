import * as S from './Divider.styles'

export default function Divider({ children }) {
  return (
    <S.Wrapper>
      <S.Line />
      <S.Text>{children}</S.Text>
      <S.Line />
    </S.Wrapper>
  )
}
