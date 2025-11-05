// src/components/Flow/graphUtils.js
import { Position } from "reactflow";

/* 레이아웃/줌 상수 */
export const H_SPACING = 260;
export const V_SPACING = 110;
export const COLLIDE_EPS = 12;
export const ROOT_X_OFFSET = 120;
export const MIN_ZOOM = 0.5;

/* 기본 유틸 */
export const countIncoming = (eds, id) => eds.filter((e) => e.target === id).length;
export const countOutgoing = (eds, id) => eds.filter((e) => e.source === id).length;

export const getRoots = (nds, eds) => nds.filter((n) => countIncoming(eds, n.id) === 0);

export const getTail = (nds, eds) => {
  const cands = nds.filter((n) => countOutgoing(eds, n.id) === 0);
  if (!cands.length) return null;
  return cands.sort((a, b) => (a.position?.x ?? 0) - (b.position?.x ?? 0))[cands.length - 1];
};

export const findFreeSpot = (nodes, startX, startY) => {
  let x = startX;
  let y = startY;
  while (
    nodes.some(
      (n) =>
        Math.abs((n.position?.x ?? 0) - x) < COLLIDE_EPS &&
        Math.abs((n.position?.y ?? 0) - y) < COLLIDE_EPS
    )
  ) {
    y += V_SPACING;
  }
  return { x, y };
};

export const computeIncomingMap = (edges) => {
  const map = new Map();
  edges.forEach((e) => map.set(e.target, (map.get(e.target) || 0) + 1));
  return map;
};

export const withHandlesByRoot = (nodes, edges) => {
  const incoming = computeIncomingMap(edges);
  return nodes.map((n) => {
    const isRoot = !incoming.get(n.id);
    if (isRoot) {
      const { targetPosition, ...rest } = n;
      return { ...rest, sourcePosition: Position.Right };
    }
    return { ...n, sourcePosition: Position.Right, targetPosition: Position.Left };
  });
};

export function centerGraphOnce(instance, zoom = MIN_ZOOM) {
  requestAnimationFrame(() => {
    const rendered = instance.getNodes();
    if (!rendered.length) {
      instance.setViewport({ x: 0, y: 0, zoom });
      return;
    }
    const F_W = 160, F_H = 40;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of rendered) {
      const x = n.position?.x ?? 0;
      const y = n.position?.y ?? 0;
      const w = n.width ?? F_W;
      const h = n.height ?? F_H;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    instance.setCenter(cx, cy, { zoom, duration: 0 });
  });
}

/* 선형 그래프 유효성 검사 */
export function validateLinear(nodes, edges) {
  const errors = [];
  const roots = getRoots(nodes, edges);
  if (roots.length !== 1) {
    errors.push(`루트 노드는 반드시 1개여야 합니다. 현재: ${roots.length}개`);
  }
  for (const n of nodes) {
    const inCnt = countIncoming(edges, n.id);
    const outCnt = countOutgoing(edges, n.id);
    if (inCnt > 1) errors.push(`노드 ${n.id}는 부모가 ${inCnt}개입니다(최대 1개).`);
    if (outCnt > 1) errors.push(`노드 ${n.id}는 자식이 ${outCnt}개입니다(최대 1개).`);
  }
  return { ok: errors.length === 0, errors };
}
