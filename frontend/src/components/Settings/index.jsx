import * as S from './Settings.styles'
import APIUsageCard from '@/components/Settings/APIUsageCard'
import APIKeyList from '@/components/Settings/APIKeyList'
import ModelSelection from '@/components/Settings/ModelSelection'
import Sidebar from '@/components/layout/Sidebar'
import { useSidebarStore } from '@/store/useSidebarStore'

export default function Settings() {
  const { isCollapsed } = useSidebarStore()

  const sidebarWidth = isCollapsed ? '70px' : '240px'

  return (
    <S.Layout>
      <Sidebar />
      <S.Content $sidebarWidth={sidebarWidth}>
        <S.TopRow>
          <APIUsageCard />
          <APIKeyList />
        </S.TopRow>
        <ModelSelection />
      </S.Content>
    </S.Layout>
  )
}
