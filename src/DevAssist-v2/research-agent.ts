import {
  AIMessage,
  createAgent,
  HumanMessage,
  modelCallLimitMiddleware,
  StructuredTool,
  toolCallLimitMiddleware,
  ToolMessage,
  type BaseMessage,
} from "langchain";
import { getChatModel } from "../packages/models/models.js";
import { makeTools } from "./tools/makeTools.js";
import z from "zod";
const tools = makeTools({ userId: "fAM9GkvxnzQ74jIQMPNf2lhK0ioRGV07" });
const model = getChatModel().bindTools(tools);
const history: BaseMessage[] = [];
const toolByName = new Map(tools.map((t) => [t.name, t]));

const Report = z.object({
  summary: z.string(),
  findings: z.array(
    z.object({ claim: z.string(), evidence: z.string(), source: z.string() }),
  ),
  openQuestions: z.array(z.string()),
});
const SYSTEM_PROMPT = `
You are a research assistant that returns structured research reports.
You MUST always call the structured report output tool before finishing.
Never reply with conversational text, a greeting, or a clarification request.
For an incomplete or non-research request, return a report with a concise
summary, an empty findings array, and the missing details in openQuestions.
For a research request, use the available tools to gather evidence before
writing the report. Separate claims from their supporting evidence, cite the
relevant source for each finding, and list any questions that remain unresolved.
Return the required structured report, even if this request is incomplete or
only a greeting.
`;
const researchAgent = createAgent({
  tools,
  model,
  systemPrompt: SYSTEM_PROMPT,
  responseFormat: Report,
  middleware: [
    toolCallLimitMiddleware({
      toolName: "search_documents",
      runLimit: 1,
    }),
    toolCallLimitMiddleware({
      toolName: "get_user_profile",
      runLimit: 1,
    }),
    toolCallLimitMiddleware({
      toolName: "web_search",
      runLimit: 1,
    }),
    toolCallLimitMiddleware({
      toolName: "scrape_webpage_content",
      runLimit: 1,
    }),
    toolCallLimitMiddleware({
      toolName: "scrape_and_interact_with_webpage",
      runLimit: 1,
    }),
    modelCallLimitMiddleware({
      runLimit: 10,
    }),
  ],
});

export default researchAgent;
