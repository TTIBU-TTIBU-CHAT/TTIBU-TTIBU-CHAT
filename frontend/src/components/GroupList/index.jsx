import * as S from './GroupList.styles'
import ListItem from '@/components/common/ListItem'
import { mockGroups } from '@/data/mockListData'
import { useNavigate } from '@tanstack/react-router'
import {useGroups} from '@/hooks/useGroups'
export default function GroupList() {
  const navigate = useNavigate()
  const { data: groups, isLoading } = useGroups();

  const handleClickGroup = (id) => {
    navigate({ to: `/groups/${id}` })
  }

  return (
    <S.Container>
      <S.Title>그룹</S.Title>
      {groups.map((group) => (
        <ListItem
          key={group.id}
          title={group.name}
          summary={group.summary}
          tags={group.tags}
          date={group.date}
          onClick={() => handleClickGroup(group.id)}
        />
      ))}
    </S.Container>
  )
}
