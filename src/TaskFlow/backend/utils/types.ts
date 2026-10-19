import { StateSchema } from "@langchain/langgraph";
import z from "zod";

export const TaskFlowState = new StateSchema({
  task: z.string(),
});

