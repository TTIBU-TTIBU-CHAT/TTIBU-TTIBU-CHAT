import * as S from './SignUpForm.styles'
import InputField from '@/components/auth/InputField'
import SubmitButton from '@/components/auth/SubmitButton'
import { Link } from '@tanstack/react-router'

export default function SignUpForm() {
  return (
    <S.Form>
      <S.Title>Create your TTIBU-TTIBU-CHAT account</S.Title>

      <InputField type="text" placeholder="아이디" />
      <InputField type="password" placeholder="비밀번호" />
      <InputField type="password" placeholder="비밀번호 확인" />
      <InputField type="text" placeholder="닉네임" />

      <SubmitButton>Sign up</SubmitButton>

      <Link to="/login">
        <S.BackLink>Back to log in</S.BackLink>
      </Link>
    </S.Form>
  )
}
