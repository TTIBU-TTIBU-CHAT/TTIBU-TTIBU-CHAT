import { useState } from 'react'
import * as S from './APIKeyModal.styles'

export default function APIKeyModal({ initialData, onClose, onSubmit, onDelete }) {
  const isEditMode = !!initialData?.id

  const [form, setForm] = useState(
    initialData || { apiKey: '', expireDate: '', status: '' }
  )
  const [isDeleting, setIsDeleting] = useState(false)

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value })
  }

  const handleSubmit = () => {
    if (!form.expireDate) {
      alert('날짜를 입력해주세요.')
      return
    }
    if (!form.status) {
      alert('상태를 선택해주세요.')
      return
    }

    onSubmit(form)
    onClose()
  }

  const handleDelete = async () => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      setIsDeleting(true)
      onClose()
      await onDelete(form.id)
      setIsDeleting(false)
    }
  }

  return (
    <S.Overlay>
      <S.Modal>
        <S.Header>
          <S.Title>{isEditMode ? 'key 수정' : 'key 등록'}</S.Title>
          <S.CloseButton onClick={onClose}>×</S.CloseButton>
        </S.Header>

        <S.Body>
          <S.Field>
            <label>API Key</label>
            <S.Input
              type="password"
              placeholder="API Key를 입력하세요"
              value={form.apiKey}
              onChange={(e) => handleChange('apiKey', e.target.value)}
            />
          </S.Field>

          <S.Field>
            <label>상태</label>
            <S.StatusGroup>
              {['활성', '비활성'].map((status) => (
                <S.StatusButton
                  key={status}
                  $active={form.status === status}
                  onClick={() => handleChange('status', status)}
                >
                  {status}
                </S.StatusButton>
              ))}
            </S.StatusGroup>
          </S.Field>

          <S.Field>
            <label>만료일 <span style={{ color: '#dc2626' }}>*</span></label>
            <S.Input
              type="date"
              value={form.expireDate}
              onChange={(e) => handleChange('expireDate', e.target.value)}
              required
            />
          </S.Field>
        </S.Body>

        <S.Footer>
          {isEditMode && (
            <S.DeleteButton onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? '삭제 중...' : '삭제'}
            </S.DeleteButton>
          )}
          <S.ApplyButton onClick={handleSubmit}>적용하기</S.ApplyButton>
        </S.Footer>
      </S.Modal>
    </S.Overlay>
  )
}
