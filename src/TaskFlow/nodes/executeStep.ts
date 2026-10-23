import type { TaskFlowState } from "../utils/types.js";
import { askQuestion } from "../utils/ask.js";
import { Command } from "@langchain/langgraph";

export const executeStepNode = async (state: typeof TaskFlowState.State) => {
  const step = state.plan[state.currentStep];
  if (step?.risk === "high") {
    const humanAnswer = await askQuestion(`Approve ${step.name} (yes/no)`);
    if (humanAnswer == "yes") {
      console.log(`   ✅ Executed: ${step.name}`);
      return { currentStep: state.currentStep + 1 };
    }
  }
  console.log("User Rejected the Step : ", step?.name);
  return new Command({
    goto: "plan",
  });
};
