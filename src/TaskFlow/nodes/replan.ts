import type { GraphNode } from "@langchain/langgraph";
import type { TaskFlowState } from "../utils/types.js";
import { replanStep } from "../lib/queries.js";

export const replan: GraphNode<typeof TaskFlowState> = async (state) => {
  const results = await Promise.all(
    state.rejections.map((rejection) =>
      replanStep(state.query, rejection.step, rejection.feedback),
    ),
  );
  const replacementPlans = results.flat();
  return {
    plans: replacementPlans,
    currentStep: 0,
    rejections: [],
    replanCount: state.replanCount + 1,
  };
};
