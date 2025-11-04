// SearchContent.jsx
import { useMemo, useRef, useState } from "react";
import * as S from "../ModalShell.styles";

// FlowCanvas와 동일한 MIME 키
const DND_MIME = "application/x-ttibu-resultcard";

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
    // 카드 스타일을 최대한 동일하게 (hover 그림자 등)
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

  /** ✅ 드래그 시작: 원본 숨김 + 불투명 drag image */
  const handleDragStart = (e, item) => {
    // FlowCanvas로 전달할 페이로드
    const payload = {
      id: item.id,
      label: item.question,
      question: item.question,
      answer: item.answer,
      tags: item.tags,
      date: item.date,
      type: "chat",
    };
    e.dataTransfer.setData(DND_MIME, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "copy";

    const cardEl = e.currentTarget;
    dragOriginRef.current = cardEl;

    // 1) 원본을 숨겨 "그 카드가 움직이는 느낌" 강화
    cardEl.style.opacity = "0";      // visibility:hidden 대신 공간 보존용
    cardEl.style.cursor = "grabbing";

    // 2) 불투명 클론을 drag image로 지정
    const img = makeDragImage(cardEl);
    dragImgRef.current = img;

    // 포인터 상대 좌표로 자연스러운 오프셋
    const native = e.nativeEvent;
    const offsetX =
      typeof native.offsetX === "number" ? native.offsetX : Math.min(24, img.offsetWidth / 2);
    const offsetY =
      typeof native.offsetY === "number" ? native.offsetY : Math.min(24, img.offsetHeight / 2);

    e.dataTransfer.setDragImage(img, offsetX, offsetY);
  };

  /** ✅ 드래그 종료: 원본 복구 + 클론 제거 */
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
            // 클릭 선택도 유지
            onClick={() =>
              onSelect?.({ id: item.id, label: item.question, type: "chat" })
            }
            // ✅ HTML5 DnD
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
