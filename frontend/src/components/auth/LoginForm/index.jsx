import * as S from './LoginForm.styles'
import InputField from '@/components/auth/InputField'
import SubmitButton from '@/components/auth/SubmitButton'
import Divider from '@/components/auth/Divider'
import { Link } from '@tanstack/react-router'
import { useAuthStore } from '@/store/useAuthStore'
import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

export default function LoginForm() {
  const { signIn } = useAuthStore()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email: '',
    password: '',
  })

  const [error, setError] = useState('')

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value})
    console.log('나 바뀌는 중임')
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      await signIn({
        email: form.email,
        password: form.password,
      })
      alert('로그인 성공!')
      navigate({ to: '/' })
    } catch (err) {
      setError('로그인 중 오류가 발생했습니다.')
      console.log(err)
    }
  }

  return (
    <S.Form onSubmit={handleSubmit}>
      <S.Title>Welcome to TTIBU-TTIBU-CHAT</S.Title>

      <InputField
        name="email" 
        type="email"
        value={form.email}
        onChange={handleChange} 
        placeholder="아이디" 
        required
      />
      <InputField
        name="password" 
        type="password"
        value={form.password}
        onChange={handleChange} 
        placeholder="비밀번호"
        required
      />

      {error && <S.ErrorMessage>{error}</S.ErrorMessage>}

      <SubmitButton>Login</SubmitButton>

      <Divider>or</Divider>

      <Link to="/signup">
        <S.SecondaryButton>Create an account</S.SecondaryButton>
      </Link>
    </S.Form>
  )
}
