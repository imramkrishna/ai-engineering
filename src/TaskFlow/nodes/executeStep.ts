import type { TaskFlowState } from "../utils/types.js";
import { askQuestion } from "../utils/ask.js";

export const executeStepNode = async (state: typeof TaskFlowState.State) => {
  const step = state.plans[state.currentStep];

  if (!step) {
    return {
      currentStep: state.currentStep + 1,
    };
  }
  if (step?.risk === "high") {
    const humanAnswer = await askQuestion(`Approve ${step.name} (yes/no)`);
    if (humanAnswer == "yes") {
      console.log(`   ✅ Executed: ${step.name}`);
    } else {
      console.log(`User Rejected the Step : ${step.name}`);
    }
    return {
      currentStep: state.currentStep + 1,
    };
  }
  console.log("Executed : ", step.name);
  return {
    currentStep: state.currentStep + 1,
  };
};
