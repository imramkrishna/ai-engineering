import type { GraphNode } from "@langchain/langgraph";
import type { TaskFlowState } from "../utils/types.js";
import { generatePlan } from "../lib/ queries.js";
import { askQuestion } from "../utils/ask.js";

export const planNode: GraphNode<typeof TaskFlowState> = async (state) => {
  return{
  }
};
