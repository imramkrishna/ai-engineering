import type { GraphNode } from "@langchain/langgraph";
import type { TaskFlowState } from "../utils/types.js";
import { askQuestion } from "../utils/ask.js";

export const executeStepNode: GraphNode<typeof TaskFlowState> = async (
  state,
) => {
  const step = state.plan[state.currentStep];
  if (step?.risk === "high") {
    const humanAnswer = await askQuestion(`Approve ${step.name} (yes/no)`);
    if (humanAnswer != "yes") {
      console.log(`   ✅ Executed: ${step.name}`);
      return { currentStep: state.currentStep + 1 };
    }
  }
  console.log(`   ✅ Executed: ${step?.name}`);
  return { currentStep: state.currentStep + 1 };
};
