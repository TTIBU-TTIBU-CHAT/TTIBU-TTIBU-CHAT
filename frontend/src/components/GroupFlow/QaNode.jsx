import React from "react";
import { Handle, Position, useStore } from "reactflow";
import styled from "styled-components";

const CARD_W = 250; // 고정 너비(px)
const CARD_H = 130; // 고정 높이(px)

function useZoomTier() {
  const zoom = useStore((s) => s.transform[2]);
  if (zoom >= 1.5) return { tier: "full", zoom };
  if (zoom >= 1.0) return { tier: "summary", zoom };
  return { tier: "label", zoom };
}

export default function QaNode({ data = {}, sourcePosition, targetPosition }) {
  const { tier: baseTier } = useZoomTier();

  const {
    label = "제목 없음",
    summary,
    question,
    answer,
    date,
  } = data;
  console.log("QaNode data:", data);
  // ✅ 그룹 노드는 2단계: <1.0 => label / >=1.0 => summary
  const isGroup = data?.kind === "group";
  const tier = isGroup ? (baseTier === "label" ? "label" : "summary") : baseTier;

  const showFull = !isGroup && tier === "full";

  return (
    <NodeShell>
      {!showFull ? (
        <LiteCard $group={isGroup}>
          {tier === "label" ? (
            <LiteTitle title={label}>{label}</LiteTitle>
          ) : (
            summary && <LiteSummary title={summary}>{summary}</LiteSummary>
          )}
        </LiteCard>
      ) : (
        <FullCard>
          <HeadRow>
            <Badge tone="blue">QUESTION</Badge>
            {date && <MetaDate>{date}</MetaDate>}
          </HeadRow>

          <OneLine title={question || label}>{question || label}</OneLine>

          <Divider />

          <HeadRow>
            <Badge tone="gray">ANSWER</Badge>
            {date && <MetaDate>{date}</MetaDate>}
          </HeadRow>

          <OneLineMuted title={answer}>{answer}</OneLineMuted>
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
  background: ${({ $group }) => ($group ? "#F4FAF7" : "#ffffff")}; /* 그룹은 연녹색 */
  border: 1px solid ${({ $group }) => ($group ? "#BFEAD0" : "rgba(0,0,0,0.08)")};
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

/* full (일반 QA 카드 전용) */
const FullCard = styled.article`
  width: ${CARD_W}px;
  height: ${CARD_H}px;
  padding: 14px 14px 10px;
  border-radius: 16px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.06);

  display: grid;
  grid-template-rows: auto auto auto auto 1fr;
  row-gap: 6px;

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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
