import * as S from './ListItem.styles'

export default function ListItem({ title, summary, tags, date, onClick, menu, onMenuToggle }) {
  return (
    <S.Item onClick={onClick}>
      <S.Content>
        <S.Title>{title}</S.Title>
        {summary && <S.Summary>{summary}</S.Summary>}
        {Array.isArray(tags) && tags.length > 0 && (
          <S.TagWrapper>
            {tags.slice(0, 5).map((t) => <S.Tag key={t}>{t}</S.Tag>)}
            {tags.length > 5 && <S.Tag $extra>+{tags.length - 5}</S.Tag>}
          </S.TagWrapper>
        )}
      </S.Content>

      <S.RightArea onClick={(e) => e.stopPropagation()}>
        {date && <S.Date>{date}</S.Date>}

        {/* optional 케밥메뉴 (부모에서 열림상태/토글 제어) */}
        {menu && (
          <S.MenuWrap>
            <S.KebabButton type="button" onClick={onMenuToggle}>
              <S.KebabDots>
                <span/><span/><span/>
              </S.KebabDots>
            </S.KebabButton>
            {menu.open && (
              <S.Menu>
                <S.MenuItem onClick={menu.onRename}>이름 수정</S.MenuItem>
                <S.MenuItem $danger onClick={menu.onDelete}>삭제</S.MenuItem>
              </S.Menu>
            )}
          </S.MenuWrap>
        )}
      </S.RightArea>
    </S.Item>
  )
}
