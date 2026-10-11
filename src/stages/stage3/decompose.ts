import z from "zod";
import { getChatModel } from "../../packages/models/models.js";
const model = getChatModel();
const Plan = z.object({
  subQuestions: z
    .array(z.string())
    .max(4)
    .describe(
      "Independent questions whose answers together answer the original. One item if already simple.",
    ),
});
let question =
  "compare our 2024 and 2025 travel policies on per diem and approvals";
const { subQuestions } = await model
  .withStructuredOutput(Plan)
  .invoke(question);

  console.log(subQuestions)
