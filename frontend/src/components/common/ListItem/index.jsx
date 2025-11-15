import * as S from './ListItem.styles';

export default function ListItem({
  id,
  title,
  summary,
  tags,
  date,
  onClick,
  menu,
  onMenuToggle,
}) {
  return (
    <S.Item onClick={onClick}>
      <S.Content>
        <S.Title>{title}</S.Title>
        {summary && <S.Summary>{summary}</S.Summary>}
        {Array.isArray(tags) && tags.length > 0 && (
          <S.TagWrapper>
            {tags.slice(0, 5).map((t) => (
              <S.Tag key={t}>{t}</S.Tag>
            ))}
            {tags.length > 5 && <S.Tag $extra>+{tags.length - 5}</S.Tag>}
          </S.TagWrapper>
        )}
      </S.Content>

      {/* 오른쪽 정보를 최대한 얇고 오른쪽 끝에 붙임 */}
      <S.RightArea onClick={(e) => e.stopPropagation()}>
        {date && <S.Date>{date}</S.Date>}

        {menu && (
          <S.MenuWrap>
            <S.KebabButton
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMenuToggle?.(e);
              }}
              aria-haspopup="menu"
              aria-expanded={!!menu.open}
            >
              <S.KebabDots>
                <span />
                <span />
                <span />
              </S.KebabDots>
            </S.KebabButton>

            {menu.open && (
              <S.Menu role="menu" onClick={(e) => e.stopPropagation()}>
                <S.MenuItem role="menuitem" onClick={menu.onRename}>
                  이름 수정
                </S.MenuItem>
                <S.MenuItem role="menuitem" $danger onClick={menu.onDelete}>
                  삭제
                </S.MenuItem>
              </S.Menu>
            )}
          </S.MenuWrap>
        )}
      </S.RightArea>
    </S.Item>
  );
}
