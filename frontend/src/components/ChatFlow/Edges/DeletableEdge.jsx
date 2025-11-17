import React from "react";
import { EdgeLabelRenderer, getSmoothStepPath, useReactFlow } from "reactflow";
import { EdgeDelBtn } from "@/components/ChatFlow/styles";

export default function DeletableEdge(props) {
  const {
    id,
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
    style,
    markerEnd,
    selected,
  } = props;

  const { setEdges } = useReactFlow();

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  const onDelete = (e) => {
    e.stopPropagation();
    setEdges((eds) => eds.filter((e) => e.id !== id));
  };

  return (
    <>
      <path className="react-flow__edge-path" d={edgePath} style={style} markerEnd={markerEnd} />
      {selected && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
            }}
          >
            <EdgeDelBtn onClick={onDelete} aria-label="엣지 삭제">−</EdgeDelBtn>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
