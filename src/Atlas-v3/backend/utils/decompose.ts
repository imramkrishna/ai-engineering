import z from "zod";
import { getChatModel } from "../../../packages/models/models.js";
const model = getChatModel();
const Plan = z.object({
  subQuestions: z
    .array(z.string())
    .max(4)
    .describe(
      "Independent questions whose answers together answer the original. One item if already simple.",
    ),
});

async function decomposeQuestion(question: string) {
  const { subQuestions } = await model
    .withStructuredOutput(Plan)
    .invoke(question);

  return subQuestions
}

export default decomposeQuestion
