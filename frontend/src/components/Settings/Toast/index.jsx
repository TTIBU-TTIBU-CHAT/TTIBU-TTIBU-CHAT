import { useEffect } from 'react'
import * as S from './Toast.styles'

export default function Toast({ type, message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <S.Toast $type={type}>
      {type === 'loading' ? '⏳' : type === 'success' ? '✅' : '⚠️'} {message}
    </S.Toast>
  )
}
