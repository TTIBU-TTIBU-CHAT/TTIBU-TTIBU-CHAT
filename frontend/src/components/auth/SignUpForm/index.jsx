import * as S from './SignUpForm.styles'
import InputField from '@/components/auth/InputField'
import SubmitButton from '@/components/auth/SubmitButton'
import { Link } from '@tanstack/react-router'
import { useAuthStore } from '@/store/useAuthStore'
import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

export default function SignUpForm() {
  const { signUp } = useAuthStore()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    name: '',
  })

  const [error, setError] = useState('')

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (form.password !== form.passwordConfirm){
      setError('비밀번호가 일치하지 않습니다.')
      return
    }
    
    if (form.password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.')
      return
    }

    try {
      await signUp({
        email: form.email,
        password: form.password,
        name: form.name,
      })
      alert('회원가입 성공!')
      navigate({ to: '/login' })
    } catch (err) {
      setError('회원가입 중 오류가 발생했습니다.')
      console.log(err)
    }
  }

  return (
    <S.Form onSubmit={handleSubmit}>
      <S.Title>Create your TTIBU-TTIBU-CHAT account</S.Title>

      <InputField
        name="email"
        type="email"
        value={form.email}
        onChange={handleChange}
        placeholder="이메일을 입력해주세요."
        required
      />
      <InputField 
        name="password"
        type="password"
        value={form.password}
        onChange={handleChange}
        placeholder="8자 이상의 비밀번호를 입력해주세요."
        required
      />
      <InputField 
        name="passwordConfirm"
        type="password" 
        value={form.passwordConfirm}
        onChange={handleChange}
        placeholder="비밀번호 확인"
        required
      />
      <InputField 
        name="name"
        type="text"
        value={form.name}
        onChange={handleChange}
        placeholder="닉네임을 입력해주세요."
        required
      />

      {error && <S.ErrorMessage>{error}</S.ErrorMessage>}

      <SubmitButton>Sign up</SubmitButton>

      <Link to="/login">
        <S.BackLink>Back to log in</S.BackLink>
      </Link>
    </S.Form>
  )
}
