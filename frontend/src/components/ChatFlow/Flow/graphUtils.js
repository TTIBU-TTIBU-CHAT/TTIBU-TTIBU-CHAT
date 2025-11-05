// src/components/Flow/graphUtils.js
import { Position } from "reactflow";

/* ===== 상수 ===== */
export const H_SPACING = 260;
export const V_SPACING = 110;
export const COLLIDE_EPS = 12;
export const MAX_PER_COL = 5;
export const ROOT_X_OFFSET = 120;
export const MIN_ZOOM = 0.5;

/* ===== 선택/배치 유틸 ===== */
export const getChildren = (edges, parentId) =>
  edges.filter((e) => e.source === parentId).map((e) => e.target);

export const zigzag = (n) => (n === 0 ? 0 : n % 2 === 1 ? Math.ceil(n / 2) : -n / 2);

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

/* ===== 핸들 유틸 ===== */
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
      const { targetPosition, ...rest } = n; // 루트는 target 핸들 제거
      return { ...rest, sourcePosition: Position.Right };
    }
    return { ...n, sourcePosition: Position.Right, targetPosition: Position.Left };
  });
};

/* ===== 뷰포트 중앙 정렬 ===== */
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
