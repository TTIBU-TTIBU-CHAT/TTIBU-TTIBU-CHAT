import { nodeStyle } from "./styles";

// (선택) 방향 상수: "LR" or "TB"
export const LAYOUT = "LR";
const isHorizontal = LAYOUT === "LR";

const SOURCE_POS = isHorizontal ? "right" : "bottom";
const TARGET_POS = isHorizontal ? "left"  : "top";

export const initialNodes = [
  {
    id: "n1",
    position: { x: 120, y: 140 },
    data: { label: "다익스트라 개념" },
    style: nodeStyle,
    sourcePosition: SOURCE_POS,
    // 루트는 FlowCanvas에서 target 숨김 처리됨(좌측 점 X)
    targetPosition: TARGET_POS,
  },
  {
    id: "n2",
    position: { x: 420, y: 140 },
    data: { label: "우선순위큐" },
    style: nodeStyle,
    sourcePosition: SOURCE_POS,
    targetPosition: TARGET_POS,
  },
  {
    id: "n3",
    position: { x: 420, y: 300 },
    data: { label: "시간복잡도 O(E log V)" },
    style: nodeStyle,
    sourcePosition: SOURCE_POS,
    targetPosition: TARGET_POS,
  },
  {
    id: "n4",
    position: { x: 120, y: 300 },
    data: { label: "BFS/DFS 비교" },
    style: nodeStyle,
    sourcePosition: SOURCE_POS,
    targetPosition: TARGET_POS,
  },
];

import { edge } from "./utils";
export const initialEdges = [edge("n1", "n2"), edge("n2", "n3"), edge("n1", "n4")];
