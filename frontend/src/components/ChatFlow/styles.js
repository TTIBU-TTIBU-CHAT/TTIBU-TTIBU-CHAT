import styled, { createGlobalStyle } from "styled-components";
import { MarkerType } from "reactflow";

/* 선택된 노드 강조: 내부 첫 번째 div(Box)를 타겟팅 */
export const GlobalRFStyles = createGlobalStyle`
  .react-flow__node.selected > div {
    border-color: #006e35ff !important;
    box-shadow:
      0 0 0 3px #3367d9;
    border-radius: 5px;
  }

  /* 엣지 색감 기본 */
  .react-flow__edge-path {
    stroke: #bfc6d2;
    stroke-width: 2px;
  }
  .react-flow__edge.selected .react-flow__edge-path {
    stroke: #8aa6ff;
  }
`;

/* 캔버스 컨테이너 */
export const FlowWrap = styled.div`
  position: absolute;
  inset: 0;
  z-index: 1;
`;

/* ReactFlow 노드 래퍼 자체는 투명하게 (중복 보더/그림자 방지) */
export const nodeStyle = {
  background: "transparent",
  border: "none",
  padding: 0,
  borderRadius: 14,
  boxShadow: "none",
};

/* 엣지: 은은한 회색 + 닫힌 화살촉 */
export const edgeStyle = {
  type: "smoothstep",
  animated: false,
  markerEnd: { type: MarkerType.ArrowClosed, color: "#bfc6d2", width: 18, height: 18 },
  style: { stroke: "#bfc6d2", strokeWidth: 2 },
  interactionWidth: 24,
};

/* 그룹 노드 스타일 생성기 (필요시 사용) */
export const makeGroupNodeStyle = ({
  bg = "#F4FAF7",
  border = "#BFEAD0",
  dashed = true,
} = {}) => ({
  ...nodeStyle,
  background: bg,
  border: `2px ${dashed ? "dashed" : "solid"} ${border}`,
  borderRadius: 14,
  padding: "12px 14px",
});

/* 오버레이 버튼 공용 */
export const AbsoluteBox = styled.div`
  position: absolute;
  z-index: 5;
  pointer-events: auto;
  display: flex;
`;

export const IconBtn = styled.button`
  min-width: 36px;
  height: 28px;
  padding: 0 10px;
  border-radius: 14px;
  border: 1px solid ${({ $danger }) => ($danger ? "#f1c9c9" : "#cfe9da")};
  background: ${({ $danger }) => ($danger ? "#f6e9e9" : "#edf9f3")};
  color: ${({ $danger }) => ($danger ? "#b74e4e" : "#2d9364")};
  font-size: 18px;
  line-height: 1;
  font-weight: 900;
  box-shadow: 0 6px 14px rgba(0,0,0,.06);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

export const EdgeDelBtn = styled.button`
  width: 28px;
  height: 28px;
  border-radius: 14px;
  border: 1px solid #f1c9c9;
  background: #f6e9e9;
  color: #b74e4e;
  font-size: 18px;
  line-height: 1;
  font-weight: 900;
  box-shadow: 0 6px 14px rgba(0,0,0,.06);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;
