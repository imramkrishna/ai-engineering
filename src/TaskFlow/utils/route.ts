import { END } from "@langchain/langgraph";
import type { TaskFlowState } from "./types.js";

export const routeAfterExecuteStep = (
  state: typeof TaskFlowState.State,
): "__end__" | "executeStep" | "replan" => {
  if (state.currentStep < state.plans.length) {
    return "executeStep";
  }

  if (state.rejections.length > 0 && state.replanCount < 2) {
    return "replan";
  }

  return END;
};
