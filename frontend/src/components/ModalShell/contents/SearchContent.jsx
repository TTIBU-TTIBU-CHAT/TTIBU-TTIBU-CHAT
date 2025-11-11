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

// 서버 응답 → UI 표준 아이템으로 정규화
function normalizeResult(raw) {
  // 서버 필드 예시 대응
  const id =
    raw.id ?? raw.chat_id ?? raw.room_id ?? raw.key ?? String(Math.random());
  const question =
    raw.question ?? raw.title ?? raw.prompt ?? raw.summary ?? `#${id}`;
  // 답변 본문 후보
  const answer =
    raw.answer ??
    raw.content ??
    raw.preview ??
    raw.snippet ??
    raw.text ??
    "";
  const date =
    raw.updated_at ?? raw.answered_at ?? raw.created_at ?? raw.date ?? null;
  const tags = raw.tags ?? raw.keywords ?? [];

  return { id, question, answer, date, tags, __raw: raw };
}

export function SearchContent({ onPick }) {
  // ← onSelect → onPick 사용

  // 검색 입력 + 태그 칩
  const [query, setQuery] = useState("");
  const [chips, setChips] = useState(["알고리즘"]);

  // 디바운스된 키워드(칩 포함)
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const q = query.trim();
    // 칩을 단순히 키워드에 추가: "q chip1 chip2 ..."
    const combo = [q, ...chips].filter(Boolean).join(" ").trim();
    const t = setTimeout(() => setDebounced(combo), 250);
    return () => clearTimeout(t);
  }, [query, chips]);

  // 필요한 서버 필터가 있으면 body에 추가
  const extraBody = useMemo(() => {
    // 예: { branchId: 190, limit: 50 }
    return {};
  }, []);

  const { data, isLoading, isFetching, isError, error } = useSearchChats(
    debounced,
    extraBody
  );

  // 서버 응답 스키마에 맞춰 데이터 꺼내기
  const rawList =
    (Array.isArray(data) && data) ||
    data?.data ||
    data?.results ||
    data?.items ||
    [];
  const list = Array.isArray(rawList) ? rawList.map(normalizeResult) : [];

  // 드래그 비주얼 관리
  const dragImgRef = useRef(null);
  const dragOriginRef = useRef(null);

  const removeChip = (label) =>
    setChips((prev) => prev.filter((c) => c !== label));

  const addChipFromQuery = () => {
    const t = query.trim();
    if (!t) return;
    if (!chips.includes(t)) setChips((prev) => [...prev, t]);
    setQuery("");
  };

  /* ✅ 드래그 시작: 두 MIME 키 모두 setData */
  const handleDragStart = (e, item) => {
    const payload = {
      id: item.id,
      label: item.question,
      question: item.question,
      answer: item.answer,
      tags: item.tags,
      date: item.date,
      type: "chat",
      // kind 없음 → 일반 결과
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
      typeof native.offsetX === "number"
        ? native.offsetX
        : Math.min(24, img.offsetWidth / 2);
    const offsetY =
      typeof native.offsetY === "number"
        ? native.offsetY
        : Math.min(24, img.offsetHeight / 2);
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
      tags: item.tags,
      type: "chat",
      // kind 없음 → FlowCanvas.applyContentToNode에서 일반 카드로 처리
    });
  };

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
          <div style={{ padding: 12, color: "#6b7280", fontSize: 13 }}>
            검색 중…
          </div>
        )}
        {isError && (
          <div style={{ padding: 12, color: "#ef4444", fontSize: 13 }}>
            검색 중 오류가 발생했어요. {error?.message || ""}
          </div>
        )}
        {!isLoading &&
          !isFetching &&
          !isError &&
          debounced &&
          Array.isArray(list) &&
          list.length === 0 && (
            <div style={{ padding: 12, color: "#6b7280", fontSize: 13 }}>
              검색 결과가 없어요.
            </div>
          )}

        {/* 결과 카드 */}
        {list.map((item) => (
          <S.ResultCard
            key={item.id}
            onClick={() => handlePick(item)} // ★ 클릭 → onPick(payload)
            draggable
            onDragStart={(e) => handleDragStart(e, item)}
            onDragEnd={handleDragEnd}
            style={{ cursor: "grab" }}
          >
            <S.CardHeader>
              <S.Badge tone="blue">QUESTION</S.Badge>
              {item.date && (
                <S.MetaDate>
                  {new Date(item.date).toLocaleString()}
                </S.MetaDate>
              )}
            </S.CardHeader>

            <S.CardTitle>{item.question}</S.CardTitle>

            <S.CardDivider />

            <S.CardHeader style={{ marginTop: 10 }}>
              <S.Badge tone="gray">ANSWER</S.Badge>
              {item.date && (
                <S.MetaDate>
                  {new Date(item.date).toLocaleString()}
                </S.MetaDate>
              )}
            </S.CardHeader>

            {item.answer && <S.CardExcerpt>{item.answer}</S.CardExcerpt>}

            {Array.isArray(item.tags) && item.tags.length > 0 && (
              <S.TagRow>
                {item.tags.map((t) => (
                  <S.TagPill key={String(t)}>{String(t)}</S.TagPill>
                ))}
              </S.TagRow>
            )}
          </S.ResultCard>
        ))}
      </S.SearchScroll>
    </>
  );
}
