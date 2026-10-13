import { createAgent, toolStrategy } from "langchain";
import z from "zod";
import { getChatModel } from "../../packages/models/models.js";
import { makeTools } from "../../DevAssist-v1/tools/makeTools.js";
const Report = z.object({
  summary: z.string(),
  findings: z.array(
    z.object({ claim: z.string(), evidence: z.string(), source: z.string() }),
  ),
  openQuestions: z.array(z.string()),
});
const model = getChatModel();
const tools = makeTools({ userId: "fAM9GkvxnzQ74jIQMPNf2lhK0ioRGV07" });
const systemPrompt = `
You are a research assistant that returns structured research reports.
You MUST always call the structured report output tool before finishing.
Never reply with conversational text, a greeting, or a clarification request.
For an incomplete or non-research request, return a report with a concise
summary, an empty findings array, and the missing details in openQuestions.
For a research request, use the available tools to gather evidence before
writing the report. Separate claims from their supporting evidence, cite the
relevant source for each finding, and list any questions that remain unresolved.
`;

const researcher = createAgent({
  model,
  tools,
  systemPrompt,
  responseFormat: toolStrategy(Report),
});

export async function runResearch(task: string) {
  const result = await researcher.invoke({
    messages: [
      {
        role: "user",
        content: `Research request: ${task}

Return the required structured report, even if this request is incomplete or
only a greeting.`,
      },
    ],
  });

  if (!result.structuredResponse) {
    const finalMessage = result.messages.at(-1);
    throw new Error(
      `The research agent did not return a structured report. Final message: ${
        typeof finalMessage?.content === "string"
          ? finalMessage.content
          : JSON.stringify(finalMessage?.content)
      }`,
    );
  }

  return result.structuredResponse;
}
