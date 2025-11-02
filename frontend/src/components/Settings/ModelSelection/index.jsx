import { useState } from 'react'
import * as S from './ModelSelection.styles'
import { mockModels } from '@/data/mockSettingsData'

export default function ModelSelection() {
  const [activeTab, setActiveTab] = useState('OpenAI')
  const [models, setModels] = useState(mockModels)
  const [isDefaultMode, setIsDefaultMode] = useState(false) // false = 기본모드 (다중 선택), true = 디폴트모드 (단일 선택)

  const handleSelectModel = (tab, id) => {
    setModels((prev) => {
      const updated = { ...prev }

      updated[tab] = prev[tab].map((m) => {
        if (isDefaultMode) {
          // 디폴트 모드: 하나만 선택 가능
          if (m.id === id) {
            // 새 디폴트 지정
            return { ...m, isDefault: true, selected: true }
          }
          // 디폴트 해제 시 기존 디폴트는 기본 모델로 유지
          return { ...m, isDefault: false }
        } else {
          // 기본 모드: 여러 개 선택 가능
          if (m.isDefault) {
            // 디폴트 모델은 항상 기본 모델로 포함 (해제 불가)
            return { ...m, selected: true }
          }
          if (m.id === id) {
            return { ...m, selected: !m.selected }
          }
          return m
        }
      })

      return updated
    })
  }

  return (
    <S.Card>
      <S.Header>
        <S.Title>모델 선택</S.Title>
        <S.ToggleWrapper>
          <label>{isDefaultMode ? '디폴트 모델 선택' : '디폴트 모델 선택 해제'}</label>
          <S.Toggle
            type="checkbox"
            checked={isDefaultMode}
            onChange={() => setIsDefaultMode((prev) => !prev)}
          />
        </S.ToggleWrapper>
      </S.Header>

      <S.Tabs>
        {['OpenAI', 'Gemini', 'Claude'].map((tab) => (
          <S.Tab
            key={tab}
            onClick={() => setActiveTab(tab)}
            $active={activeTab === tab}
          >
            {tab}
          </S.Tab>
        ))}
      </S.Tabs>

      <S.ModelGrid>
        {models[activeTab].map((model) => (
          <S.ModelCard
            key={model.id}
            $selected={!isDefaultMode && model.selected}
            $isDefault={model.isDefault}
            onClick={() => handleSelectModel(activeTab, model.id)}
          >
            <S.ModelTitle>
              {model.name}
              {model.isDefault && <S.DefaultBadge>디폴트</S.DefaultBadge>}
            </S.ModelTitle>
            <S.ModelDesc>{model.desc}</S.ModelDesc>
          </S.ModelCard>
        ))}
      </S.ModelGrid>

      <S.SaveButton>저장</S.SaveButton>
    </S.Card>
  )
}
