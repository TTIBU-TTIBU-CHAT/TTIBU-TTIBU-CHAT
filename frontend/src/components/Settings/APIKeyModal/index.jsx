import { useState, useEffect } from 'react'
import * as S from './APIKeyModal.styles'
import { useAiKey } from '@/hooks/useAiKey'
import { useModelStore } from '@/store/useModelStore'

export default function APIKeyModal({ initialData, onClose, onSubmit, onDelete }) {
  const { providers, fetchProviders } = useAiKey()
  const { fetchModelsFromMe } = useModelStore()

  const [form, setForm] = useState({
    keyUid: 0,
    key: '',
    expirationAt: '',
    isActive: false,
    providerUid: '',
    providerCode: '',
  })

  useEffect(() => {
    const load = async () => {
      await fetchProviders()

      if (initialData && Object.keys(initialData).length > 0) {
        setForm({
          keyUid: initialData.keyUid ?? 0,
          key: initialData.key ?? '',
          expirationAt: initialData.expirationAt ?? '',
          isActive: initialData.isActive ?? false,
          providerCode: initialData.providerCode ?? '',
        })
      }
    }

    load()
  }, [initialData])

  const isEditMode = !!form.keyUid

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    if (!form.key) return alert('API Key를 입력해주세요.')
    if (!form.expirationAt) return alert('만료일을 입력해주세요.')
    if (form.isActive !== true && form.isActive !== false)
      return alert('상태를 지정해주세요.')

    const payload = {
      keyUid: form.keyUid,
      key: form.key,
      expirationAt: form.expirationAt,
      isActive: form.isActive,
      ...(isEditMode
        ? {} 
        : { providerUid: Number(form.providerUid) || 0 })
    }

    console.log('[SUBMIT PAYLOAD]', payload)
    await onSubmit(payload)

    await fetchModelsFromMe()
  }

  const handleDelete = async () => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      await onDelete(form.keyUid)
      await fetchModelsFromMe()
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
          {/* 제공사 선택 */}
          <S.Field>
            <label>
              제공사 <span style={{ color: '#dc2626' }}>*</span>
            </label>
            {isEditMode ? (
              <S.DisabledBox>{form.providerCode || '제공사 정보 없음'}</S.DisabledBox>
            ) : (
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
            )}
          </S.Field>

          {/* API Key 입력 */}
          <S.Field>
            <label>
              API Key <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="password"
              placeholder="API Key를 입력하세요"
              value={form.key}
              onChange={(e) => handleChange('key', e.target.value)}
            />
          </S.Field>

          {/* 상태 선택 */}
          <S.Field>
            <label>
              상태 <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <S.StatusGroup>
              {[{ label: '활성', value: true }, { label: '비활성', value: false }].map(
                ({ label, value }) => (
                  <S.StatusButton
                    key={label}
                    $active={form.isActive === value}
                    onClick={() => handleChange('isActive', value)}
                  >
                    {label}
                  </S.StatusButton>
                )
              )}
            </S.StatusGroup>
          </S.Field>

          {/* 만료일 */}
          <S.Field>
            <label>
              만료일 <span style={{ color: '#dc2626' }}>*</span>
            </label>
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
