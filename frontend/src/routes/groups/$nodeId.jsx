import { createFileRoute } from "@tanstack/react-router";
import GroupFlowPage from "./GroupFlowPage";

export const Route = createFileRoute("/groups/$nodeId")({
  component: GroupFlowPage,
});
