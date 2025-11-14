// src/components/ModalShell/contents/SearchContent.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import * as S from "../ModalShell.styles";
import { useSearchChats } from "@/hooks/useRoomChats";

/* ✅ 두 MIME 모두로 setData (호환성↑) */
const DND_MIME_RESULT = "application/x-ttibu-resultcard";
const DND_MIME_GROUP = "application/x-ttibu-card";

// 불투명한 drag image 복제본 생성
function makeDragImage(node) {
  const rect = node.getBoundingClientRect();
  const clone = node.cloneNode(true);

  Object.assign(clone.style, {
    position: "fixed",
    top: "-1000px",
    left: "-1000px",
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    opacity: "1",
    pointerEvents: "none",
    transform: "none",
    filter: "none",
    imageRendering: "auto",
    willChange: "auto",
    zIndex: "2147483647",
    background: "#fff",
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: "16px",
    boxShadow: "0 14px 32px rgba(64,105,146,0.25)",
  });

  document.body.appendChild(clone);
  return clone;
}

// 서버 응답 → UI 표준 아이템으로 정규화 (백엔드 스펙에 맞춤)
function normalizeResult(raw) {
  const id = raw.chatUid ?? raw.id ?? raw.chat_id ?? raw.room_id ?? String(Math.random());
  const question = raw.question ?? `#${id}`;
  const answer = raw.answer ?? "";
  const date = raw.updatedAt ?? raw.answeredAt ?? raw.questionedAt ?? raw.created_at ?? null;
  const keywords = raw.keywords ?? raw.keywords ?? [];
  return { id, question, answer, date, keywords, __raw: raw };
}

export function SearchContent({ onPick }) {
  // 검색 입력 + 태그 칩
  const [query, setQuery] = useState("");
  const [chips, setChips] = useState(["알고리즘"]);

  // 페이지네이션
  const [page, setPage] = useState(0);
  const size = 20;

  // query를 칩으로 확정하는 UX (Enter/돋보기 클릭)
  const addChipFromQuery = () => {
    const t = query.trim();
    if (!t) return;
    if (!chips.includes(t)) setChips((prev) => [...prev, t]);
    setQuery("");
    setPage(0); // 새 검색이면 첫 페이지로
  };

  const removeChip = (label) => {
    setChips((prev) => {
      const next = prev.filter((c) => c !== label);
      // 칩이 하나도 없으면 검색 비활성 → 페이지/리스트 초기화
      if (next.length === 0) setPage(0);
      return next;
    });
  };

  // ✅ 훅은 [키워드 배열, page, size] 를 받음
  const keywords = useMemo(() => chips, [chips]);
  console.log("Searching chats with keywords:", keywords, "page:", page, "size:", size);
  const { data, isLoading, isFetching, isError, error } = useSearchChats(keywords, page, size);

  // 훅은 Page<SearchedResultInfo>를 data로 반환하도록 구성됨
  const pageData = data ?? {};
  const content = Array.isArray(pageData.content) ? pageData.content : [];
  const list = content.map(normalizeResult);
  const totalPages = pageData.totalPages ?? 0;
  const number = pageData.pageable?.pageNumber ?? pageData.number ?? page;

  // 드래그 비주얼 관리
  const dragImgRef = useRef(null);
  const dragOriginRef = useRef(null);

  /* ✅ 드래그 시작: 두 MIME 키 모두 setData */
  const handleDragStart = (e, item) => {
    const payload = {
      id: item.id,
      label: item.question,
      question: item.question,
      answer: item.answer,
      keywords: item.keywords,
      date: item.date,
      type: "chat",
    };

    const json = JSON.stringify(payload);
    e.dataTransfer.setData(DND_MIME_RESULT, json);
    e.dataTransfer.setData(DND_MIME_GROUP, json);
    e.dataTransfer.effectAllowed = "copy";

    const cardEl = e.currentTarget;
    dragOriginRef.current = cardEl;
    cardEl.style.opacity = "0";
    cardEl.style.cursor = "grabbing";

    const img = makeDragImage(cardEl);
    dragImgRef.current = img;

    const native = e.nativeEvent;
    const offsetX =
      typeof native.offsetX === "number" ? native.offsetX : Math.min(24, img.offsetWidth / 2);
    const offsetY =
      typeof native.offsetY === "number" ? native.offsetY : Math.min(24, img.offsetHeight / 2);
    e.dataTransfer.setDragImage(img, offsetX, offsetY);
  };

  const handleDragEnd = () => {
    if (dragOriginRef.current) {
      dragOriginRef.current.style.opacity = "";
      dragOriginRef.current.style.cursor = "";
      dragOriginRef.current = null;
    }
    if (dragImgRef.current) {
      dragImgRef.current.remove();
      dragImgRef.current = null;
    }
  };

  /* ✅ 클릭(선택) 시: 임시 노드에 꽂을 ‘풀 페이로드’를 onPick으로 전달 */
  const handlePick = (item) => {
    onPick?.({
      id: item.id,
      label: item.question,
      question: item.question,
      answer: item.answer,
      date: item.date,
      keywords: item.keywords,
      type: "chat",
    });
  };

  // 페이지 이동
  const canPrev = number > 0;
  const canNext = totalPages > 0 && number < totalPages - 1;

  return (
    <>
      <S.SearchBarWrap>
        <S.SearchField
          placeholder="키워드 검색(예: 알고리즘)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addChipFromQuery()}
        />
        <S.SearchIconBtn onClick={addChipFromQuery}>
          <i className="fa-solid fa-magnifying-glass" />
        </S.SearchIconBtn>
      </S.SearchBarWrap>

      {chips.length > 0 && (
        <S.ChipRow>
          {chips.map((c) => (
            <S.Chip key={c}>
              {c}
              <button onClick={() => removeChip(c)}>×</button>
            </S.Chip>
          ))}
        </S.ChipRow>
      )}

      <S.SearchScroll>
        {/* 상태 안내 */}
        {(isLoading || isFetching) && (
          <div style={{ padding: 12, color: "#6b7280", fontSize: 13 }}>검색 중…</div>
        )}
        {isError && (
          <div style={{ padding: 12, color: "#ef4444", fontSize: 13 }}>
            검색 중 오류가 발생했어요. {error?.message || ""}
          </div>
        )}
        {!isLoading && !isFetching && !isError && keywords.length > 0 && list.length === 0 && (
          <div style={{ padding: 12, color: "#6b7280", fontSize: 13 }}>검색 결과가 없어요.</div>
        )}

        {/* 결과 카드 */}
        {list.map((item) => (
          <S.ResultCard
            key={item.id}
            onClick={() => handlePick(item)}
            draggable
            onDragStart={(e) => handleDragStart(e, item)}
            onDragEnd={handleDragEnd}
            style={{ cursor: "grab" }}
          >
            <S.CardHeader>
              <S.Badge tone="blue">QUESTION</S.Badge>
              {item.date && <S.MetaDate>{new Date(item.date).toLocaleString()}</S.MetaDate>}
            </S.CardHeader>

            <S.CardTitle>{item.question}</S.CardTitle>

            <S.CardDivider />

            <S.CardHeader style={{ marginTop: 10 }}>
              <S.Badge tone="gray">ANSWER</S.Badge>
              {item.date && <S.MetaDate>{new Date(item.date).toLocaleString()}</S.MetaDate>}
            </S.CardHeader>

            {item.answer && <S.CardExcerpt>{item.answer}</S.CardExcerpt>}


          </S.ResultCard>
        ))}
      </S.SearchScroll>

      {/* 페이지네이션 (간단 버전) */}
      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, justifyContent: "center", padding: 10 }}>
          <button disabled={!canPrev} onClick={() => canPrev && setPage((p) => p - 1)}>
            이전
          </button>
          <span style={{ fontSize: 12, color: "#6b7280" }}>
            {number + 1} / {totalPages}
          </span>
          <button disabled={!canNext} onClick={() => canNext && setPage((p) => p + 1)}>
            다음
          </button>
        </div>
      )}
    </>
  );
}