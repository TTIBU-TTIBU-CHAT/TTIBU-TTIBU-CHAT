import * as S from './Settings.styles'
import APIUsageCard from '@/components/Settings/APIUsageCard'
import APIKeyList from '@/components/Settings/APIKeyList'
import ModelSelection from '@/components/Settings/ModelSelection'
import Sidebar from '@/components/layout/Sidebar'

export default function Settings() {
  return (
    <S.Layout>
      <Sidebar />
      <S.Content>

        <S.TopRow>
          <APIUsageCard />
          <APIKeyList />
        </S.TopRow>
        <ModelSelection />
      </S.Content>
    </S.Layout>
  )
}
