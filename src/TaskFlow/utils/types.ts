import { StateSchema } from "@langchain/langgraph";
import z from "zod";

export const planNode = z.object({
  name: z.string(),
  risk: z.enum(["high", "low"]),
});

export const TaskFlowState = new StateSchema({
  plan: z.array(planNode),
  currentStep: z.number().default(0),
});


