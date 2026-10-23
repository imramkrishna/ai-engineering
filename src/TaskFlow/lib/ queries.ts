import { planNode } from "../utils/types.js";
import { getChatModel } from "../../packages/models/models.js";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { z } from "zod";
import { taskPlannerSystemPrompt } from "./prompts.js";
const model = getChatModel();

export async function generatePlan(query: string) {
  const systemMessage = new SystemMessage(taskPlannerSystemPrompt);
  const result = await model
    .withStructuredOutput(z.array(planNode))
    .invoke([systemMessage, new HumanMessage(query)]);

  return result;
}
