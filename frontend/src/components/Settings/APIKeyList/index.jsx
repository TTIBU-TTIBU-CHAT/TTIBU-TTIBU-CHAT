import { useEffect, useState } from 'react'
import * as S from './APIKeyList.styles'
import APIKeyModal from '@/components/Settings/APIKeyModal'
import Toast from '@/components/Settings/Toast'
import { useAiKey } from '@/hooks/useAiKey'

export default function APIKeyList() {
  const { createKey, updateKey, deleteKey, fetchAllKeys, fetchKey } = useAiKey()
  const [apis, setApis] = useState([])
  const [modalData, setModalData] = useState(null)
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadKeys()
  }, [])

  const loadKeys = async () => {
    try {
      const res = await fetchAllKeys()
      if (res?.data?.status === 'success') {
        const keys = res.data.data?.keys ?? []
        setApis(
          keys.map((k) => ({
            keyUid: k.keyUid,
            providerCode: k.providerCode,
            isActive: k.isActive,
          }))
        )
      }
    } catch (err) {
      setToast({ type: 'error', message: '키 목록 조회 실패' })
    }
  }

  const handleAdd = () => setModalData({}) 

  const handleEdit = async (api) => {
    try {
      setLoading(true)
      const res = await fetchKey(api.keyUid)
      console.log(res)
      if (res?.data?.status === 'success') {
        const keyDetail = res.data.data
        setModalData({
          keyUid: keyDetail.keyUid,
          providerCode: keyDetail.providerCode,
          key: keyDetail.key,
          isActive: keyDetail.isActive,
          expirationAt: keyDetail.expirationAt,
        })
      } else {
        setToast({ type: 'error', message: '키 상세 조회 실패' })
      }
    } catch (err) {
      console.error(err)
      setToast({ type: 'error', message: err.response.data.data.reason })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => setModalData(null)

  const handleSubmit = async (form) => {
    try {
      if (form.keyUid) {
        await updateKey({
          keyUid: form.keyUid,
          key: form.key,
          isActive: form.isActive,
          expirationAt: form.expirationAt,
        })
        setToast({ type: 'success', message: '키가 수정되었습니다.' })
      } else {
        await createKey({
          providerUid: form.providerUid,
          key: form.key,
          isActive: form.isActive,
          expirationAt: form.expirationAt,
        })
        setToast({ type: 'success', message: '키가 등록되었습니다.' })
      }

      handleClose()
      await loadKeys()
    } catch (err) {
      console.log(err.response.data.data.reason)
      setToast({ type: 'error', message: err.response.data.data.reason })
    }
  }

  const handleDelete = async (id) => {
    try {
      setToast({ type: 'loading', message: '삭제 중...' })
      await deleteKey(id)
      setToast({ type: 'success', message: '키가 삭제되었습니다.' })
      await loadKeys()
    } catch (err) {
      setToast({ type: 'error', message: err.response.data.data.reason })
    }
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
            key={api.keyUid}
            $status={api.isActive}
            onClick={() => handleEdit(api)}
          >
            <span>{api.providerCode}</span>
            <S.StatusLabel $status={api.isActive}>
              {api.isActive ? '활성' : '비활성'}
            </S.StatusLabel>
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