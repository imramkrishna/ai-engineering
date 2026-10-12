import z from "zod";
import { getChatModel } from "../../../packages/models/models.js";
import { HumanMessage, SystemMessage } from "langchain";

const QueryAnalysis = z.object({
  standaloneQuery: z.string(),
  filters: z.object({
    years: z.array(z.number()),
    documentNames: z.array(z.string()),
    sections: z.array(z.string()),
  }),
  intent: z.enum([
    "factual",
    "comparison",
    "summary",
    "procedure",
    "list",
    "calculation",
  ]),
});
const chatModel = getChatModel();
async function generateStandaloneQuery(history: any[], question: string) {
  const analysis = await chatModel.withStructuredOutput(QueryAnalysis).invoke([
    new SystemMessage(`
      Rewrite the latest question as a standalone search query.
      Use conversation history.
      Extract filters such as years, document names, and sections.
    `),
    ...history,
    new HumanMessage(question),
  ]);
  return analysis;
}

export default generateStandaloneQuery;
