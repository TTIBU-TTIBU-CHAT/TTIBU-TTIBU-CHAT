import * as S from './AuthLayout.styles'
import Logo from '@/components/common/Logo'

export default function AuthLayout({ children }) {
  return (
    <S.Layout>
      <S.LogoWrapper>
        <Logo />
      </S.LogoWrapper>
      <S.Box>{children}</S.Box>
    </S.Layout>
  )
}
