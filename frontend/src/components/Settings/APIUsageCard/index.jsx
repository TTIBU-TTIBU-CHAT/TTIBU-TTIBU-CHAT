import * as S from './APIUsageCard.styles'
import { mockUsageData } from '@/data/mockSettingsData'

export default function APIUsageCard() {
  return (
    <S.Card>
      <S.Title>API 총 사용량</S.Title>
      <S.CircleWrapper>
        <S.Circle>
          <S.TokenCount>{mockUsageData.totalTokens}</S.TokenCount>
          <S.TokenLabel>Token 사용</S.TokenLabel>
        </S.Circle>
      </S.CircleWrapper>
      <S.List>
        {mockUsageData.details.map((d) => (
          <S.ListItem key={d.model}>
            {`${d.model} ${d.tokens} Token 사용`}
          </S.ListItem>
        ))}
      </S.List>
      <S.InfoBox>
        ℹ️ 사용 수치는 예측 값입니다. 
          실제 사용량과 오차가 있을 수 있습니다.
      </S.InfoBox>
    </S.Card>
  )
}
