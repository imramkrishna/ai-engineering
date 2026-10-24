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
      console.log(`✅ Executed: ${step.name}`);
      return {
        currentStep: state.currentStep + 1,
      };
    } else {
      console.log(`User Rejected the Step : ${step.name}`);
      const humanFeedback = await askQuestion(
        "Do you want to add any feedback for llm for this step : ",
      );
      return {
        currentStep: state.currentStep + 1,
        rejections: [
          ...state.rejections,
          {
            step: step.name,
            feedback: humanFeedback,
          },
        ],
      };
    }
  }
  console.log("Executed : ", step.name);
  return {
    currentStep: state.currentStep + 1,
  };
};
