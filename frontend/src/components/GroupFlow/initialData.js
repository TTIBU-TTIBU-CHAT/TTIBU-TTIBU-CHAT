import { nodeStyle } from "./styles";
import { edge } from "./utils";

// 방향 상수: "LR" or "TB"
export const LAYOUT = "LR";
const isHorizontal = LAYOUT === "LR";

const SOURCE_POS = "right" ;
const TARGET_POS = "left";

/* ===================== 🧩 노드 정의 ===================== */
export const initialNodes = [
  {
    id: "n1",
    position: { x: 120, y: 140 },
    data: {
      label: "다익스트라 개념",
      keyword: "최단 경로 탐색 기본 원리",
      question: "다익스트라 알고리즘이란 무엇인가요?",
      answer:
        "다익스트라 알고리즘은 하나의 시작 정점에서 다른 모든 정점까지의 최단 경로를 찾는 알고리즘으로, 음의 가중치가 없는 그래프에서 사용됩니다.",
      summary: "가중치가 양수인 그래프에서 최단 경로를 찾는 알고리즘입니다.",
    },
    style: nodeStyle,
    sourcePosition: SOURCE_POS,
    targetPosition: TARGET_POS,
  },
  {
    id: "n2",
    position: { x: 420, y: 140 },
    data: {
      label: "우선순위큐",
      keyword: "최단 거리 노드 선택",
      question: "다익스트라에서 우선순위 큐는 왜 사용하나요?",
      answer:
        "방문하지 않은 노드 중 최단 거리가 가장 짧은 노드를 빠르게 선택하기 위해 우선순위 큐를 사용합니다. 보통 최소 힙 구조로 구현됩니다.",
      summary: "가장 짧은 거리의 노드를 효율적으로 선택하기 위해 사용됩니다.",
    },
    style: nodeStyle,
    sourcePosition: SOURCE_POS,
    targetPosition: TARGET_POS,
  },
  {
    id: "n3",
    position: { x: 420, y: 300 },
    data: {
      label: "시간복잡도 O(E log V)",
      keyword: "성능 분석",
      question: "다익스트라 알고리즘의 시간 복잡도는 어떻게 되나요?",
      answer:
        "우선순위 큐를 사용하면 간선 E개와 정점 V개에 대해 O(E log V)의 시간 복잡도를 가집니다.",
      summary: "힙을 사용할 경우 O(E log V)의 시간 복잡도를 가집니다.",
    },
    style: nodeStyle,
    sourcePosition: SOURCE_POS,
    targetPosition: TARGET_POS,
  },
  {
    id: "n4",
    position: { x: 120, y: 300 },
    data: {
      label: "BFS/DFS 비교",
      keyword: "탐색 방식 비교",
      question: "BFS/DFS와 다익스트라의 차이점은 무엇인가요?",
      answer:
        "BFS는 간선 가중치가 모두 같을 때 최단 경로 탐색에 사용되고, 다익스트라는 서로 다른 가중치를 가진 그래프에서도 사용 가능합니다. DFS는 깊이 우선 탐색으로, 최단 경로를 보장하지 않습니다.",
      summary: "BFS는 균등 가중치 그래프용, 다익스트라는 가중치 다양한 그래프용.",
    },
    style: nodeStyle,
    sourcePosition: SOURCE_POS,
    targetPosition: TARGET_POS,
  },
];

/* ===================== 🧩 엣지 정의 ===================== */
export const initialEdges = [
  edge("n1", "n2"),
  edge("n2", "n3"),
  edge("n1", "n4"),
];
