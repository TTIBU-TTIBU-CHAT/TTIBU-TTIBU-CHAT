import { useState, useEffect } from 'react'
import * as S from './APIKeyModal.styles'
import { useAiKey } from '@/hooks/useAiKey'

export default function APIKeyModal({ initialData, onClose, onSubmit, onDelete }) {
  const isEditMode = !!initialData?.id

  const [form, setForm] = useState(
    initialData || { key: '', expirationAt: '', isActive: false, providerUid: 0 }
  )

  const { providers, fetchProviders } = useAiKey()

  useEffect(() => {
    fetchProviders()
  }, [])

  const handleChange = (field, value) => setForm({ ...form, [field]: value })

  const handleSubmit = () => {
    if (!form.providerUid) return alert('제공사를 선택해주세요.')
    if (!form.key) return alert('API Key를 입력해주세요.')
    if (!form.expirationAt) return alert('만료일을 입력해주세요.')
    if (form.isActive !== true && form.isActive !== false)
      return alert('상태를 지정해주세요.')

    const payload = {
      ...form,
      providerUid: Number(form.providerUid),
      isActive: form.isActive,
    };

    console.log('[SUBMIT PAYLOAD]', payload);
    onSubmit(payload);
  }

  const handleDelete = async () => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      await onDelete(form.keyUid)
      onClose()
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
            <label>제공사 <span style={{ color: '#dc2626' }}>*</span></label>
            <select
              value={form.providerUid}
              onChange={(e) => handleChange('providerUid', e.target.value)}
            >
              <option value="">선택하세요</option>
              {providers.map((p) => (
                <option key={p.providerUid} value={p.providerUid}>
                  {p.providerCode}
                </option>
              ))}
            </select>
          </S.Field>

          <S.Field>
            <label>API Key <span style={{ color: '#dc2626' }}>*</span></label>
            <input
              type="password"
              placeholder="API Key를 입력하세요"
              value={form.key}
              onChange={(e) => handleChange('key', e.target.value)}
            />
          </S.Field>

          <S.Field>
            <label>상태 <span style={{ color: '#dc2626' }}>*</span></label>
            <S.StatusGroup>
              {[
                { label: '활성', value: true },
                { label: '비활성', value: false },
              ].map(({ label, value }) => (
                <S.StatusButton
                  key={label}
                  $active={form.isActive === value}
                  onClick={() => handleChange('isActive', value)}
                >
                  {label}
                </S.StatusButton>
              ))}
            </S.StatusGroup>
          </S.Field>

          <S.Field>
            <label>만료일 <span style={{ color: '#dc2626' }}>*</span></label>
            <S.Input
              type="date"
              value={form.expirationAt}
              onChange={(e) => handleChange('expirationAt', e.target.value)}
              required
            />
          </S.Field>
        </S.Body>

        <S.Footer>
          {isEditMode && (
            <S.DeleteButton onClick={handleDelete}>삭제</S.DeleteButton>
          )}
          <S.ApplyButton onClick={handleSubmit}>적용하기</S.ApplyButton>
        </S.Footer>
      </S.Modal>
    </S.Overlay>
  )
}
