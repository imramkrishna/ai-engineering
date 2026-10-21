import { END } from "@langchain/langgraph";
import type { TaskFlowState } from "./types.js";

export const routeAfterExecuteStep = (
  state: typeof TaskFlowState.State,
): "__end__" | "executeStep" => {
  return state.plan.length === state.currentStep + 1 ? END : "executeStep";
};
