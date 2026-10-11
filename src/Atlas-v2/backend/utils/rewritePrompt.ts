import z from "zod";
import { getChatModel } from "../../../packages/models/models.js";

const QueryAnalysis = z.object({
  standaloneQuery: z.string(),
  intent: z.enum([
    "factual",
    "comparison",
    "summary",
    "list",
    "timeline",
    "calculation",
    "procedural",
  ]),
  subQuestions: z.array(z.string()).max(6),
  filters: z.object({
    documentNames: z.array(z.string()),
    years: z.array(z.number()),
    pages: z.array(z.number()),
  }),
});
const model=getChatModel()
async function rewriteNewPrompt(history: [], question: string) {
  const rewrite = `
Rewrite the latest user question as a standalone search query.

Conversation history:
${history}

Latest question:
${question}

Also extract useful metadata filters such as year, document name, department,
page, or policy type.
`;

const rewritten=await model.withStructuredOutput(QueryAnalysis).invoke(rewrite)
return rewritten;
}
