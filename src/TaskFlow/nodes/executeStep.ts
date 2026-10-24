import type { TaskFlowState } from "../utils/types.js";
import { askQuestion } from "../utils/ask.js";
import { Command } from "@langchain/langgraph";

export const executeStepNode = async (state: typeof TaskFlowState.State) => {
  const step = state.plans[state.currentStep];

  if (!step) {
    return {
      currentStep: state.currentStep + 1,
    };
  }
  const humanAnswer = await askQuestion(`Approve ${step.name} (yes/no)`);
  if (step?.risk === "high") {
    if (humanAnswer == "yes") {
      console.log(`   ✅ Executed: ${step.name}`);
    } else {
      console.log(`User Rejected the Step : ${step.name}`);
    }
  } else {
    console.log(`   ✅ Executed: ${step.name}`);
  }

  return {
    currentStep: state.currentStep + 1,
  };
};
