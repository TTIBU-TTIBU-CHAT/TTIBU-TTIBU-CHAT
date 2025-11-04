import { createFileRoute } from "@tanstack/react-router";
import ChatFlowPage from "./ChatFlowPage";

export const Route = createFileRoute("/chatflow/$nodeId")({
  component: ChatFlowPage,
});
