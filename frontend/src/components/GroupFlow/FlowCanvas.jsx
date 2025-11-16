import { ReactFlowProvider } from "reactflow";
import { GlobalRFStyles } from "./styles";
import FlowCore from "./Flow/FlowCore";

export default function FlowCanvas({ groupData, ...props }) {
  return (
    <>
      <GlobalRFStyles />
      <ReactFlowProvider>
        <FlowCore groupData={groupData} {...props} />
      </ReactFlowProvider>
    </>
  );
}
