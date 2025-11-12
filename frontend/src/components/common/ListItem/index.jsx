import * as S from './ListItem.styles'

export default function ListItem({ title, summary, tags, date, onClick }) {
  const renderTags = () => {
    if (!tags || tags.length === 0) return null

    const visibleTags = tags.slice(0, 5)
    const hiddenCount = tags.length - visibleTags.length

    return (
      <S.TagWrapper>
        {visibleTags.map((tag) => (
          <S.Tag key={tag}>{tag}</S.Tag>
        ))}
        {hiddenCount > 0 && <S.Tag $extra>+{hiddenCount}</S.Tag>}
      </S.TagWrapper>
    )
  }

  return (
    <S.Item onClick={onClick}>
      <S.Content>
        <S.Title>{title}</S.Title>
        {summary && <S.Summary>{summary}</S.Summary>}
        {renderTags()}
      </S.Content>
      <S.Date>{date}</S.Date>
    </S.Item>
  )
}
