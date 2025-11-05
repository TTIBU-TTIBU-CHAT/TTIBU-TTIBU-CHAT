import { edgeStyle } from "./styles";

export function edge(source, target) {
  return { id: `${source}-${target}`, source, target, ...edgeStyle };
}

export function stripRuntimeNode(n) {
  return {
    id: n.id,
    position: { x: n.position.x, y: n.position.y },
    data: { label: n.data?.label ?? "" },
    style: undefined, // 라우트에서 nodeStyle 주입됨(초기화 시)
    sourcePosition: n.sourcePosition, // ⬅️ 추가
    targetPosition: n.targetPosition, // ⬅️ 추가
  };
}

export function stripRuntimeEdge(e) {
  return { id: e.id, source: e.source, target: e.target, ...edgeStyle };
}

export function serializeNodes(ns) {
  return JSON.stringify(
    ns.map((n) => ({
      id: n.id,
      x: n.position.x,
      y: n.position.y,
      label: n.data?.label ?? "",
    }))
  );
}

export function serializeEdges(es) {
  return JSON.stringify(
    es.map((e) => ({
      s: e.source,
      t: e.target,
    }))
  );
}
