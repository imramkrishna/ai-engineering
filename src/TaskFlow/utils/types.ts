import { StateSchema } from "@langchain/langgraph";
import z from "zod";

export const planNode = z.object({
  name: z.string(),
  risk: z.enum(["high", "low"]),
});
export const rejectionSchema = z.object({
  step: z.string(),
  feedback: z.string().default(""),
});
export const TaskFlowState = new StateSchema({
  query: z.string(),
  plans: z.array(planNode).default([]),
  currentStep: z.number().default(0),
  results: z.array(z.string()).default([]),
  rejections: z.array(rejectionSchema).default([]),
  replanCount: z.number().default(0),
});
