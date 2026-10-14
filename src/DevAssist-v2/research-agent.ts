import {
  createAgent,
  modelCallLimitMiddleware,
  toolCallLimitMiddleware,
  toolRetryMiddleware,
  toolStrategy,
} from "langchain";
import { getChatModel } from "../packages/models/models.js";
import allTools from "./tools/index.js";
import { duplicateCallMiddleware } from "./middleware/duplicate-call.js";
import z from "zod";
const model = getChatModel();

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
  tools: allTools,
  model,
  systemPrompt: SYSTEM_PROMPT,
  contextSchema: z.object({
    userId: z.string(),
    role: z.enum(["admin", "developer", "member"]),
  }),
  responseFormat: toolStrategy(Report),
  middleware: [
    duplicateCallMiddleware,
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
    toolCallLimitMiddleware({
      toolName: "search_documents_by_name",
      runLimit: 1,
    }),
    toolCallLimitMiddleware({
      toolName: "query_database",
      runLimit: 1,
    }),
    toolCallLimitMiddleware({
      toolName: "create_task",
      runLimit: 1,
    }),
    modelCallLimitMiddleware({
      runLimit: 10,
    }),
    toolRetryMiddleware({
      maxRetries: 2,
      maxDelayMs: 2000,
    }),
    
  ],
});

export default researchAgent;
