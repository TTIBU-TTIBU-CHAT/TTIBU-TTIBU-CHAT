// /src/components/flow/styles.js
import styled, { createGlobalStyle } from "styled-components";
import { MarkerType } from "reactflow";

/* ===== Global styles for selected node highlight ===== */
export const GlobalRFStyles = createGlobalStyle`
  .react-flow__node.selected {
    border: 2px solid #48b17a !important;
    box-shadow:
      0 0 0 3px rgba(72, 177, 122, .15),
      0 6px 12px rgba(0, 0, 0, .06) !important;
  }
`;

/* ===== Canvas Wrapper ===== */
export const FlowWrap = styled.div`
  position: absolute;
  inset: 0;
  z-index: 1;
`;

/* ===== Node / Edge base styles ===== */
export const nodeStyle = {
  background: "#fff",
  border: "1px solid rgba(0,0,0,.08)",
  borderRadius: 10,
  padding: "8px 10px",
  fontSize: 12,
  boxShadow: "0 6px 12px rgba(0,0,0,.06)",
};

export const edgeStyle = {
  type: "deletable",
  animated: false,
  markerEnd: { type: MarkerType.ArrowClosed, color: "#406992", width: 24, height: 24 },
  style: { stroke: "#406992", strokeWidth: 2 },
  interactionWidth: 24,
};

/**
 * ✅ 그룹 노드 스타일 생성 함수
 * (필요한 곳에서 import해서 사용)
 */
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

/* ===== Overlay Buttons ===== */
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
