import { useState, useEffect } from 'react'
import * as S from './GroupListModal.styles'
import { useCreateGroup, useUpdateGroup, useRenameGroup } from '@/hooks/useGroups'

export default function GroupListModal({ mode = 'create', initialData, onClose }) {
  const [form, setForm] = useState({
    name: '',
    nodes: '',
  })

  const createGroup = useCreateGroup()
  const updateGroup = useUpdateGroup()
  const renameGroup = useRenameGroup()

  useEffect(() => {
    if (initialData && (mode === 'update' || mode === 'rename')) {
      setForm({
        name: initialData.name || '',
        nodes: initialData.nodes ? initialData.nodes.join(', ') : '',
      })
    }
  }, [initialData, mode])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const nodesArr = form.nodes
      ? form.nodes
          .split(',')
          .map((n) => n.trim())
          .filter(Boolean)
          .map(Number)
      : []

    try {
      if (mode === 'create') {
        await createGroup.mutateAsync({
          name: form.name,
          nodes: nodesArr,
        })
        alert('그룹 생성 완료!')
      } else if (mode === 'update') {
        await updateGroup.mutateAsync({
          groupId: initialData.groupId,
          name: form.name,
          nodes: nodesArr,
          summary_regen: true,
        })
        alert('그룹 수정 완료!')
      } else if (mode === 'rename') {
        await renameGroup.mutateAsync({
          groupId: initialData.groupId,
          name: form.name,
        })
        alert('그룹 이름 수정 완료!')
      }
      onClose()
    } catch (err) {
      console.error('[MODAL] 그룹 요청 실패:', err)
      alert('요청 중 오류가 발생했습니다.')
    }
  }

  return (
    <S.Overlay>
      <S.Modal>
        <S.Title>
          {mode === 'create'
            ? '그룹 생성'
            : mode === 'update'
            ? '그룹 수정'
            : '그룹 이름 수정'}
        </S.Title>

        <form onSubmit={handleSubmit}>
          <S.Label>그룹 이름</S.Label>
          <S.Input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="그룹 이름 입력"
          />

          {mode !== 'rename' && (
            <>
              <S.Label>노드 ID 목록 (쉼표로 구분)</S.Label>
              <S.Input
                name="nodes"
                value={form.nodes}
                onChange={handleChange}
                placeholder="예: 1, 2, 3"
              />
            </>
          )}

          <S.Button type="submit">
            {mode === 'create'
              ? '생성'
              : mode === 'update'
              ? '수정'
              : '이름 변경'}
          </S.Button>

          <S.Cancel type="button" onClick={onClose}>
            닫기
          </S.Cancel>
        </form>
      </S.Modal>
    </S.Overlay>
  )
}
