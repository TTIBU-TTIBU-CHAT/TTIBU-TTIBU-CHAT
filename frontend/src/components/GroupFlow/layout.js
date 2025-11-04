// /src/components/flow/layout.js
import dagre from "dagre";

// 기본 노드 크기(측정 전) — styled width/height 없을 때 사용
const DEFAULT_NODE_WIDTH = 160;
const DEFAULT_NODE_HEIGHT = 40;

export function getLayoutedElements(nodes, edges, direction = "LR") {
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: direction,   // "LR" 좌→우, "TB" 상→하
    nodesep: 60,          // 노드 간 간격
    ranksep: 120,         // 레벨 간 간격
    marginx: 20,
    marginy: 20,
  });
  g.setDefaultEdgeLabel(() => ({}));

  // 그래프에 노드/엣지 주입
  nodes.forEach((n) => {
    const width =
      n.width ??
      n.measured?.width ??
      n.style?.width ??
      DEFAULT_NODE_WIDTH;
    const height =
      n.height ??
      n.measured?.height ??
      n.style?.height ??
      DEFAULT_NODE_HEIGHT;
    g.setNode(n.id, { width, height });
  });

  edges.forEach((e) => g.setEdge(e.source, e.target));

  dagre.layout(g);

  // dagre 결과를 React Flow 포맷의 position에 반영
  const laidOutNodes = nodes.map((n) => {
    const { x, y } = g.node(n.id) || { x: n.position.x, y: n.position.y };
    return {
      ...n,
      // Dagre는 중심 좌표를 주므로 좌상단 기준으로 보정
      position: { x: x - (n.width ?? DEFAULT_NODE_WIDTH) / 2, y: y - (n.height ?? DEFAULT_NODE_HEIGHT) / 2 },
      // 위치는 우리가 고정(드래그 가능은 editMode로 제어)
      // (필요시 'sourcePosition'/'targetPosition'도 'right'/'left'로 줄 수 있음)
    };
  });

  return { nodes: laidOutNodes, edges };
}
