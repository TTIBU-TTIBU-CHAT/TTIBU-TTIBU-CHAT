import { useState } from 'react'
import * as S from './APIKeyList.styles'
import { mockApiKeys } from '@/data/mockSettingsData'
import APIKeyModal from '@/components/Settings/APIKeyModal'
import Toast from '@/components/Settings/Toast'

export default function APIKeyList() {
  const [apis, setApis] = useState(mockApiKeys)
  const [modalData, setModalData] = useState(null)
  const [toast, setToast] = useState(null)

  const handleAdd = () => setModalData({}) 
  const handleEdit = (api) => setModalData(api)
  const handleClose = () => setModalData(null)

  const handleSubmit = (form) => {
    if (form.id) {
      setApis((prev) =>
        prev.map((a) => (a.id === form.id ? { ...a, ...form } : a))
      )
      setToast({ type: 'success', message: 'API 키가 수정되었습니다.' })
    } else {
      const newItem = {
        id: Date.now(),
        name: '신규 키',
        ...form,
      }
      setApis((prev) => [...prev, newItem])
      setToast({ type: 'success', message: 'API 키가 추가되었습니다.' })
    }

    handleClose()
  }

  const handleDelete = async (id) => {
    setToast({ type: 'loading', message: '삭제 중...' })
    await new Promise((r) => setTimeout(r, 800)) // TODO: api 연동 후 삭제
    setApis((prev) => prev.filter((a) => a.id !== id))
    setToast({ type: 'success', message: 'API 키가 삭제되었습니다.' })
  }

  return (
    <S.Card>
      <S.Header>
        <S.Title>API 키 목록</S.Title>
        <S.AddButton onClick={handleAdd}>추가</S.AddButton>
      </S.Header>

      <S.KeyList>
        {apis.map((api) => (
          <S.KeyItem
            key={api.id}
            $status={api.status}
            onClick={() => handleEdit(api)}
          >
            <span>{api.name}</span>
            <S.StatusLabel $status={api.status}>{api.status}</S.StatusLabel>
          </S.KeyItem>
        ))}
      </S.KeyList>

      {modalData && (
        <APIKeyModal
          initialData={modalData}
          onClose={handleClose}
          onSubmit={handleSubmit}
          onDelete={handleDelete}
        />
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </S.Card>
  )
}
