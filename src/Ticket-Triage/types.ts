import { StateSchema } from "@langchain/langgraph";
import z from "zod";

export const TriageState = new StateSchema({
  ticket: z.string(),
  category: z
    .enum(["bug", "billing", "question", "unknown"])
    .default("unknown"),
  draft: z.string().default(""),
  reviewNotes: z.array(z.string()).default([]),
  revisions: z.number().default(0),
});
