import type { GraphNode } from "@langchain/langgraph";
import type { TaskFlowState } from "../utils/types.js";
import { generatePlan } from "../lib/ queries.js";

export const planNode: GraphNode<typeof TaskFlowState> = async (state) => {
  const plans = await generatePlan(state.query);
  return {
    plans: plans,
  };
};
