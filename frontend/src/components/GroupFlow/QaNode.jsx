import React from "react";
import { Handle, Position, useStore } from "reactflow";
import styled from "styled-components";

const CARD_W = 250; // 고정 너비(px) — 필요시 360~480 사이로 조절
const CARD_H = 130; // 고정 높이(px) — 디자인에 맞게 조절

function useZoomTier() {
  const zoom = useStore((s) => s.transform[2]);
  if (zoom >= 1.5) return { tier: "full", zoom };
  if (zoom >= 1.0) return { tier: "summary", zoom };
  return { tier: "label", zoom };
}

export default function QaNode({ data = {}, sourcePosition, targetPosition }) {
  const { tier } = useZoomTier();
  const {
    label = "제목 없음",
    keyword,
    summary,
    question,
    answer,
    date,
    tags,
  } = data;

  return (
    <NodeShell>
      {tier !== "full" ? (
        <LiteCard>
          {tier === "label" ? (
            <LiteTitle title={keyword || label}>{keyword || label}</LiteTitle>
          ) : (
            <>
              {summary && <LiteSummary title={summary}>{summary}</LiteSummary>}
            </>
          )}
        </LiteCard>
      ) : (
        <FullCard>
          <HeadRow>
            <Badge tone="blue">QUESTION</Badge>
            {date && <MetaDate>{date}</MetaDate>}
          </HeadRow>

          {/* 질문 한 줄 고정 + ellipsis */}
          <OneLine title={question || label}>{question || label}</OneLine>

          <Divider />

          <HeadRow>
            <Badge tone="gray">ANSWER</Badge>
            {date && <MetaDate>{date}</MetaDate>}
          </HeadRow>

          {/* 답변 한 줄 고정 + ellipsis */}
          <OneLineMuted title={answer}>{answer}</OneLineMuted>

          {/* 태그는 공간이 남을 때만 한 줄로 표시(넘치면 숨김) */}
          {Array.isArray(tags) && tags.length > 0 && (
            <TagRow title={tags.join(", ")}>
              {tags.map((t) => (
                <TagPill key={t}>{t}</TagPill>
              ))}
            </TagRow>
          )}
        </FullCard>
      )}

      {/* 좌/우 작은 핸들 */}
      {typeof targetPosition !== "undefined" && (
        <Handle
          type="target"
          position={targetPosition ?? Position.Left}
          className="mini-handle"
        />
      )}
      {typeof sourcePosition !== "undefined" && (
        <Handle
          type="source"
          position={sourcePosition ?? Position.Right}
          className="mini-handle"
        />
      )}
    </NodeShell>
  );
}

/* ====================== styles ====================== */

const NodeShell = styled.div`
  width: ${CARD_W}px;
  .mini-handle {
    width: 10px;
    height: 10px;
    border-radius: 9999px;
    border: 2px solid #d6dae3;
    background: #fff;
    box-shadow: 0 0 0 2px #fff;
  }
`;

/* label / summary */
const LiteCard = styled.div`
  width: ${CARD_W}px;
  padding: 16px 18px;
  border-radius: 14px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 6px 12px rgba(31, 41, 55, 0.06);
`;
const LiteTitle = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
  text-align: center;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
const LiteSummary = styled.div`
  font-weight: 600;
  font-size: 12px;
  color: #374151;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

/* full (ResultCard 스타일 + 고정 크기) */
const FullCard = styled.article`
  width: ${CARD_W}px;
  height: ${CARD_H}px; /* ✅ 높이 고정 */
  padding: 14px 14px 10px;
  border-radius: 16px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.06);

  display: grid; /* ✅ 내부 영역을 그리드로 고정 배치 */
  grid-template-rows: auto auto auto auto 1fr;
  row-gap: 6px;

  /* hover 인터랙션 */
  transition:
    transform 0.45s cubic-bezier(0.22, 1, 0.36, 1),
    border 0.3s ease,
    box-shadow 0.45s ease;

  &:hover {
    transform: translateY(-6px);
    border: 3px solid #406992;
    box-shadow: 0 14px 32px rgba(64, 105, 146, 0.25);
  }
  &:active {
    transform: translateY(-2px);
    transition-duration: 0.15s;
  }
`;

const HeadRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 20px;
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 10px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 800;
  color: ${({ tone }) => (tone === "blue" ? "#1d4ed8" : "#374151")};
  background: ${({ tone }) =>
    tone === "blue" ? "rgba(29,78,216,.10)" : "rgba(55,65,81,.10)"};
`;
const MetaDate = styled.span`
  font-size: 11px;
  color: #6b7280;
`;

const OneLine = styled.div`
  font-size: 12px;
  font-weight: 800;
  color: #2a344a;
  line-height: 1.25;

  /* ✅ 한 줄 + ellipsis */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Divider = styled.hr`
  border: none;
  height: 1px;
  background: rgba(0, 0, 0, 0.08);
  margin: 0;
`;

const OneLineMuted = styled.div`
  font-size: 12px;
  color: #111827;
  line-height: 1.4;

  /* ✅ 한 줄 + ellipsis */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TagRow = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
  overflow: hidden; /* ✅ 넘치면 숨김 */
  white-space: nowrap;

  /* 한 줄만, 말줄임은 개별 TagPill에서 처리 */
`;
const TagPill = styled.span`
  padding: 4px 8px;
  border-radius: 9999px;
  font-size: 11px;
  color: #2b3b52;
  background: #eef2f7;

  /* 개별 태그가 너무 길 때도 잘림 */
  max-width: 140px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
