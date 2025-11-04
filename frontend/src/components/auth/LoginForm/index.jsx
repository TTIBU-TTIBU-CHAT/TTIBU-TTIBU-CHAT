import * as S from './LoginForm.styles'
import InputField from '@/components/auth/InputField'
import SubmitButton from '@/components/auth/SubmitButton'
import Divider from '@/components/auth/Divider'
import { Link } from '@tanstack/react-router'

export default function LoginForm() {
  return (
    <S.Form>
      <S.Title>Welcome to TTIBU-TTIBU-CHAT</S.Title>

      <InputField type="text" placeholder="아이디" />
      <InputField type="password" placeholder="비밀번호" />

      <SubmitButton>Login</SubmitButton>

      <Divider>or</Divider>

      <Link to="/signup">
        <S.SecondaryButton>Create an account</S.SecondaryButton>
      </Link>
    </S.Form>
  )
}
