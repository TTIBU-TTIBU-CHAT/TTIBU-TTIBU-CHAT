import { createFileRoute } from "@tanstack/react-router";
import ChatFlowPage from "./ChatFlowPage";

export const Route = createFileRoute("/chatflow")({
  component: ChatFlowPage,
});
