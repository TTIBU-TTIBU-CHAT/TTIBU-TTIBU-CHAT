import * as S from './APIUsageCard.styles'
import { useModelStore } from '@/store/useModelStore'

export default function APIUsageCard() {
  const { tokens, loading } = useModelStore()

  if (loading) {
    return <S.Card>📊 사용량 정보를 불러오는 중...</S.Card>
  }

  if (!tokens) {
    return <S.Card>⚠️ 사용량 데이터를 가져오지 못했습니다.</S.Card>
  }

  const total = tokens.totalToken ?? 0
  const details = tokens.tokenList ?? []

  return (
    <S.Card>
      <S.Title>API 총 사용량</S.Title>

      <S.CircleWrapper>
        <S.Circle>
          <S.TokenCount>{total.toLocaleString()}</S.TokenCount>
          <S.TokenLabel>Token 사용</S.TokenLabel>
        </S.Circle>
      </S.CircleWrapper>

      <S.List>
        {details.length > 0 ? (
          details.map((d) => (
            <S.ListItem key={d.providerCode}>
              {`${d.providerCode} ${d.token.toLocaleString()} Token 사용`}
            </S.ListItem>
          ))
        ) : (
          <S.ListItem>데이터 없음</S.ListItem>
        )}
      </S.List>

      <S.InfoBox>
        ℹ️ 사용 수치는 예측 값입니다. 실제 사용량과 오차가 있을 수 있습니다.
      </S.InfoBox>
    </S.Card>
  )
}
