import React from "react";
import { useStore } from "reactflow";
import { AbsoluteBox, IconBtn } from "@/components/Groupflow/styles";

export default function SelectionOverlay({ selectedNodes, lastSelectedId, onAdd, onRemove }) {
  if (!selectedNodes || selectedNodes.length === 0) return null;

  const [tx, ty, zoom] = useStore((s) => s.transform);
  const targetId = lastSelectedId ?? selectedNodes?.[0]?.id ?? null;
  const internalNode = useStore((s) => (targetId ? s.nodeInternals.get(targetId) : undefined));
  if (!internalNode) return null;

  const z = Math.max(0.7, Math.min(1.6, zoom));
  const BTN_W = 36 * z;
  const BTN_H = 28 * z;
  const GAP_X = 8 * z;
  const GAP_Y = 6 * z;
  const RADIUS = 14 * z;
  const FONT = 18 * z;

  const x = (internalNode.positionAbsolute?.x ?? internalNode.position.x) * zoom + tx;
  const y = (internalNode.positionAbsolute?.y ?? internalNode.position.y) * zoom + ty;
  const w = (internalNode.width ?? 0) * zoom;

  const TOTAL_W = BTN_W * 2 + GAP_X;

  const posStyle = {
    left: Math.round(x + w / 2 - TOTAL_W / 2),
    top: Math.round(y - (BTN_H + GAP_Y)),
    gap: GAP_X,
  };

  return (
    <AbsoluteBox style={posStyle}>
      <IconBtn
        aria-label="노드 추가"
        style={{ minWidth: BTN_W, height: BTN_H, borderRadius: RADIUS, fontSize: FONT }}
        onClick={onAdd}
      >
        +
      </IconBtn>
      <IconBtn
        $danger
        aria-label="노드 삭제"
        style={{ minWidth: BTN_W, height: BTN_H, borderRadius: RADIUS, fontSize: FONT }}
        onClick={onRemove}
      >
        −
      </IconBtn>
    </AbsoluteBox>
  );
}
