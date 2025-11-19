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

  // 🔥 raw 데이터 통합
  const raw = data?.raw || data;
  const pendingFlag = raw.pending ?? data.pending ?? raw.data?.pending ?? false;

  const answerText =
    raw.answer ??
    raw.short_summary ??
    raw.summary ??
    data.answer ??
    data.short_summary ??
    data.summary;

  // 🔥 답변/요약이 생기면 pending 이 true여도 "생성중..."을 안 띄움
  const isPending = !!pendingFlag && !answerText;

  const { label = "제목 없음", summary, question, answer, date } = data;
  const keywordsArr = raw.keywords ?? data.keywords ?? raw.data?.keywords ?? []; // 혹시 다른 위치에 있을 수도 있어 안전하게
  const firstKeyword =
    Array.isArray(keywordsArr) && keywordsArr.length > 0
      ? keywordsArr[0]
      : null;
  console.log("QaNode keywords", firstKeyword);
  const rawType = data?.type || data?.raw?.type;
  const isGroup =
    typeof rawType === "string" && rawType.toUpperCase() === "GROUP";
  const bgColor =
    data?.color || data?.raw?.color || (isGroup ? "#F4FAF7" : "#ffffff");
  const tier = isGroup
    ? baseTier === "label"
      ? "label"
      : "summary"
    : baseTier;

  const showFull = !isGroup && tier === "full";
  const displayTitle = question || label || firstKeyword || "제목 없음";
  console.log("QaNodekey",displayTitle);
  // 🔽 기존 렌더링 그대로 유지
  return (
    <NodeShell>
      {!showFull ? (
        <LiteCard $group={isGroup} $bg={bgColor} $isPending={isPending}>
          {tier === "label" ? (
            <LiteTitle title={displayTitle}>
              {isPending ? (
                <LoadingText>생성 중...</LoadingText>
              ) : (
                displayTitle
              )}
            </LiteTitle>
          ) : (
            summary && <LiteSummary title={summary}>{summary}</LiteSummary>
          )}
        </LiteCard>
      ) : (
        <FullCard $bg={bgColor} $isPending={isPending}>
          {isPending && (
            <LoadingOverlay>
              <Spinner />
              <LoadingText>답변 생성 중...</LoadingText>
            </LoadingOverlay>
          )}
          <HeadRow>
            <Badge tone="blue">QUESTION</Badge>
            {date && <MetaDate>{date}</MetaDate>}
          </HeadRow>

          <OneLine title={displayTitle}>
            {displayTitle}
          </OneLine>

          <Divider />

          <HeadRow>
            <Badge tone="gray">ANSWER</Badge>
            {date && <MetaDate>{date}</MetaDate>}
          </HeadRow>

          <OneLineMuted title={answer}>
            {isPending ? "답변 생성 중..." : answer}
          </OneLineMuted>
        </FullCard>
      )}

      <Handle
        type="target"
        position={targetPosition ?? Position.Left}
        className="mini-handle"
      />
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
  background: ${({ $bg, $group }) => $bg || ($group ? "#F4FAF7" : "#ffffff")};
  border: 1px solid ${({ $group }) => ($group ? "#BFEAD0" : "rgba(0,0,0,0.08)")};
  box-shadow: 0 6px 12px rgba(31, 41, 55, 0.06);
  opacity: ${({ $isPending }) => ($isPending ? 0.6 : 1)};
  transition: opacity 0.3s ease;
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
  background: ${({ $bg }) => $bg || "#fff"};
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.06);

  display: grid;
  grid-template-rows: auto auto auto auto 1fr;
  row-gap: 6px;
  position: relative;

  opacity: ${({ $isPending }) => ($isPending ? 0.7 : 1)};
  transition:
    transform 0.45s cubic-bezier(0.22, 1, 0.36, 1),
    border 0.3s ease,
    box-shadow 0.45s ease,
    opacity 0.3s ease;

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

/* 로딩 관련 스타일 */
const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 16px;
  z-index: 10;
`;

const Spinner = styled.div`
  width: 24px;
  height: 24px;
  border: 3px solid #e5e7eb;
  border-top-color: #406992;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const LoadingText = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
`;
