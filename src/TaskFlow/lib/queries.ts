import { planNode } from "../utils/types.js";
import { getChatModel } from "../../packages/models/models.js";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { z } from "zod";
import { taskPlannerSystemPrompt } from "./prompts.js";
const model = getChatModel();
const planResponseSchema = z.object({
  plans: z.array(planNode),
});
export async function generatePlan(query: string) {
  const systemMessage = new SystemMessage(taskPlannerSystemPrompt);
  const result = await model
    .withStructuredOutput(planResponseSchema)
    .invoke([systemMessage, new HumanMessage(query)]);
  console.log("PLANS : ", result.plans);
  return result;
}
