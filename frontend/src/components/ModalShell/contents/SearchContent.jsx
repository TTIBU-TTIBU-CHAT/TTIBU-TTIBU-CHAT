// SearchContent.jsx
import { useMemo, useRef, useState } from "react";
import * as S from "../ModalShell.styles";

/* ✅ 두 MIME 모두로 setData (호환성↑) */
const DND_MIME_RESULT = "application/x-ttibu-resultcard";
const DND_MIME_GROUP  = "application/x-ttibu-card";

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

export function SearchContent({ onSelect }) {
  const [query, setQuery] = useState("");
  const [chips, setChips] = useState(["알고리즘"]);
  const dragImgRef = useRef(null);
  const dragOriginRef = useRef(null);

  const data = useMemo(
    () =>
      Array.from({ length: 8 }).map((_, i) => ({
        id: `q${i}`,
        question: "다익스트라 알고리즘이 뭐냐?",
        answer: "시간 복잡도가 O(E log V)이며 우선순위 큐를 사용...",
        date: "2025. 10. 24",
        tags: ["알고리즘", "다익스트라", "BFS", "DFS"],
      })),
    []
  );

  const filtered = data.filter((item) => {
    const q = query.trim().toLowerCase();
    const inText =
      !q ||
      item.question.toLowerCase().includes(q) ||
      item.answer.toLowerCase().includes(q);
    const hasAllChips = chips.every((c) => item.tags.includes(c));
    return inText && hasAllChips;
  });

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
      // kind는 생략 ⇒ FlowCanvas에서 result로 처리
    };

    // 호환을 위해 두 키 모두 채움
    const json = JSON.stringify(payload);
    e.dataTransfer.setData(DND_MIME_RESULT, json);
    e.dataTransfer.setData(DND_MIME_GROUP, json); // ← FlowCanvas가 이 키만 읽어도 OK
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
        {filtered.map((item) => (
          <S.ResultCard
            key={item.id}
            onClick={() =>
              onSelect?.({ id: item.id, label: item.question, type: "chat" })
            }
            draggable
            onDragStart={(e) => handleDragStart(e, item)}
            onDragEnd={handleDragEnd}
            style={{ cursor: "grab" }}
          >
            <S.CardHeader>
              <S.Badge tone="blue">QUESTION</S.Badge>
              <S.MetaDate>{item.date}</S.MetaDate>
            </S.CardHeader>
            <S.CardTitle>{item.question}</S.CardTitle>
            <S.CardDivider />
            <S.CardHeader style={{ marginTop: 10 }}>
              <S.Badge tone="gray">ANSWER</S.Badge>
              <S.MetaDate>{item.date}</S.MetaDate>
            </S.CardHeader>
            <S.CardExcerpt>{item.answer}</S.CardExcerpt>
            <S.TagRow>
              {item.tags.map((t) => (
                <S.TagPill key={t}>{t}</S.TagPill>
              ))}
            </S.TagRow>
          </S.ResultCard>
        ))}
      </S.SearchScroll>
    </>
  );
}
