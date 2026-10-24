import { END } from "@langchain/langgraph";
import type { TaskFlowState } from "./types.js";

export const routeAfterExecuteStep = (
  state: typeof TaskFlowState.State,
): "__end__" | "executeStep" => {
  return state.currentStep >= state.plans.length ? END : "executeStep";
};
