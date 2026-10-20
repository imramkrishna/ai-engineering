import type { GraphNode } from "@langchain/langgraph";
import type { TaskFlowState } from "../utils/types.js";

export const planNode: GraphNode<typeof TaskFlowState> = async (state) => {
  return {
    plan: [
      { name: "Fetch database metrics", risk: "low" as const },
      { name: "Send email to CEO", risk: "high" as const },
    ],
    currentStep: 0,
  };
};
