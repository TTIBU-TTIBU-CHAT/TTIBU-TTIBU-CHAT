import { useMemo, useState } from "react";
import * as S from "../ModalShell.styles";

export function SearchContent({ onSelect }) {
  const [query, setQuery] = useState("");
  const [chips, setChips] = useState(["알고리즘"]);

  const data = useMemo(
    () =>
      Array.from({ length: 8 }).map((_, i) => ({
        id: `q${i}`,
        question: "다익스트라 알고리즘이 뭐냐?",
        answer: "시간 복잡도가 O(Nlog(N))으로 BFS와 DFS보다 빠른...",
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

  const removeChip = (label) => setChips((prev) => prev.filter((c) => c !== label));
  const addChipFromQuery = () => {
    const t = query.trim();
    if (!t) return;
    if (!chips.includes(t)) setChips((prev) => [...prev, t]);
    setQuery("");
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
