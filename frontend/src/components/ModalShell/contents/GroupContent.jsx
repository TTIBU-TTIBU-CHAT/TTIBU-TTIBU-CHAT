import * as S from "../ModalShell.styles";

export function GroupContent() {
  return (
    <>
      <S.Body>
        <S.Bubble>
          <strong>레이어 뷰</strong> — 이곳에 레이어/패널 목록, 토글 등을 구성하세요.
        </S.Bubble>
      </S.Body>
      <S.Footer>
        <S.InputWrap>
          <S.Input placeholder="레이어 검색/필터…" />
          <S.SendButton $disabled disabled aria-label="확인" title="확인">
            <i className="fa-solid fa-check"></i>
          </S.SendButton>
        </S.InputWrap>
      </S.Footer>
    </>
  );
}
