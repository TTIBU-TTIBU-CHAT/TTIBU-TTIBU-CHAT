import * as S from './InputField.styles'

export default function InputField({ name, type, value, onChange, placeholder, required }) {
  return (
    <S.Input
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
    />
  )
}
