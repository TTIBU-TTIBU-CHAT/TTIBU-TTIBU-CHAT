import { useState, useEffect } from 'react'
import * as S from './ModelSelection.styles'
import Toast from '@/components/Settings/Toast'
import { useModelStore } from '@/store/useModelStore'
import { modelService } from '@services/modelService'

export default function ModelSelection() {
  const { providers, selectedIds, defaultId, fetchModelsFromMe } = useModelStore()

  const [activeTab, setActiveTab] = useState('')
  const [isDefaultMode, setIsDefaultMode] = useState(false)
  const [toast, setToast] = useState(null)

  const [localSelected, setLocalSelected] = useState([])
  const [localDefault, setLocalDefault] = useState(null)

  useEffect(() => {
    fetchModelsFromMe()
  }, [])

  useEffect(() => {
    setLocalSelected(selectedIds)
    setLocalDefault(defaultId)
  }, [selectedIds, defaultId])

  useEffect(() => {
    if (providers.length > 0 && !activeTab) {
      setActiveTab(providers[0].providerCode)
    }
  }, [providers])

  const handleSelectModel = (providerCode, modelId) => {
    if (isDefaultMode) {
      // 디폴트 모드: 단일 선택
      setLocalDefault((prev) => (prev === modelId ? null : modelId))
    } else {
      // 다중 선택 모드
      setLocalSelected((prev) =>
        prev.includes(modelId)
          ? prev.filter((id) => id !== modelId)
          : [...prev, modelId]
      )
    }
  }

  const handleSave = async () => {
    try {
      setToast({ type: 'loading', message: '처리 중...' })

      if (isDefaultMode) {
        // --- 디폴트 모델 설정 ---
        if (!localDefault) {
          setToast({ type: 'warning', message: '디폴트로 지정할 모델을 선택해주세요.' })
          return
        }

        const res = await modelService.setDefaultModel(localDefault)
        if (res?.status === 200 || res?.data?.status === 'success') {
          await fetchModelsFromMe()
          setToast({ type: 'success', message: '디폴트 모델이 설정되었습니다.' })
        } else {
          setToast({ type: 'error', message: '디폴트 모델 설정 실패' })
        }
      } else {
        // --- 다중 선택 저장 ---
        if (!localSelected.length) {
          setToast({ type: 'warning', message: '최소 하나 이상의 모델을 선택해주세요.' })
          return
        }

        const res = await modelService.selectModels(localSelected)
        if (res?.status === 201 || res?.data?.status === 'success') {
          await fetchModelsFromMe()
          setToast({ type: 'success', message: '모델 선택이 저장되었습니다.' })
        } else {
          setToast({ type: 'error', message: '모델 선택 실패' })
        }
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message || '저장 중 오류 발생' })
    }
  }

  if (!providers || providers.length === 0)
    return <S.Card>모델 정보를 불러오는 중...</S.Card>

  const activeProvider = providers.find((p) => p.providerCode === activeTab)

  return (
    <S.Card>
      <S.Header>
        <S.Title>모델 선택</S.Title>
        <S.ToggleWrapper>
          <label>{isDefaultMode ? '디폴트 모델 설정' : '모델 다중 선택'}</label>
          <S.Toggle
            type="checkbox"
            checked={isDefaultMode}
            onChange={() => setIsDefaultMode((prev) => !prev)}
          />
        </S.ToggleWrapper>
      </S.Header>

      {/* 탭 영역 */}
      <S.Tabs>
        {providers.map((p) => (
          <S.Tab
            key={p.providerCode}
            $active={activeTab === p.providerCode}
            onClick={() => setActiveTab(p.providerCode)}
          >
            {p.providerCode}
          </S.Tab>
        ))}
      </S.Tabs>

      {/* 모델 카드 영역 */}
      <S.ModelGrid>
        {activeProvider?.modelList?.map((model) => {
          const isSelected = localSelected.includes(model.modelCatalogUid)
          const isDefault = model.modelCatalogUid === localDefault

          return (
            <S.ModelCard
              key={model.modelCatalogUid}
              $selected={!isDefaultMode && isSelected}
              $isDefault={isDefault}
              onClick={() => handleSelectModel(activeProvider.providerCode, model.modelCatalogUid)}
            >
              <S.ModelTitle>
                {model.modelName}
                {isDefault && <S.DefaultBadge>디폴트</S.DefaultBadge>}
              </S.ModelTitle>
            </S.ModelCard>
          )
        })}
      </S.ModelGrid>

      {/* 저장 버튼 */}
      <S.SaveButton onClick={handleSave}>
        {isDefaultMode ? '디폴트 모델 저장' : '선택 모델 저장'}
      </S.SaveButton>

      {/* 토스트 표시 */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </S.Card>
  )
}
