// src/components/Flow/FlowCanvas.jsx

import React from "react";
import { ReactFlowProvider } from "reactflow";
import { GlobalRFStyles } from "./styles";
import FlowCore from "./Flow/FlowCore";

export default function FlowCanvas(props) {
  return (
    <>
      <GlobalRFStyles />
      <ReactFlowProvider>
        <FlowCore {...props} />
      </ReactFlowProvider>
    </>
  );
}
