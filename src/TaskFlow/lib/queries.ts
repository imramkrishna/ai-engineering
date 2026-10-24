import { planNode } from "../utils/types.js";
import { getChatModel } from "../../packages/models/models.js";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { z } from "zod";
import {
  replanStepSystemPrompt,
  taskPlannerSystemPrompt,
  verifyExecutionSystemPrompt,
} from "./prompts.js";
const model = getChatModel();
const planResponseSchema = z.object({
  plans: z.array(planNode),
});
const verificationResponseSchema = z.object({
  complete: z.boolean(),
  gaps: z.array(z.string()),
});

export async function generatePlan(query: string) {
  const systemMessage = new SystemMessage(taskPlannerSystemPrompt);
  const result = await model
    .withStructuredOutput(planResponseSchema)
    .invoke([systemMessage, new HumanMessage(query)]);
  console.log("PLANS : ", result.plans);
  return result.plans;
}

export async function replanStep(
  request: string,
  rejectedStep: string,
  feedback: string,
) {
  const result = await model
    .withStructuredOutput(planResponseSchema)
    .invoke([
      new SystemMessage(replanStepSystemPrompt),
      new HumanMessage(
        `Original request:\n${request}\n\nRejected step:\n${rejectedStep}\n\nUser feedback:\n${feedback}`,
      ),
    ]);

  return result.plans;
}

export async function verifyExecution(
  request: string,
  results: string[],
  replanCount = 0,
  maxReplans = 2,
) {
  const replanLimit = Math.min(maxReplans, 2);
  const result = await model
    .withStructuredOutput(verificationResponseSchema)
    .invoke([
      new SystemMessage(verifyExecutionSystemPrompt),
      new HumanMessage(
        `Original request:\n${request}\n\nCompleted steps:\n${results
          .map((step, index) => `${index + 1}. ${step}`)
          .join("\n")}`,
      ),
    ]);

  return {
    ...result,
    canReplan: !result.complete && replanCount < replanLimit,
  };
}
