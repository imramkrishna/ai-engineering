import {
  createAgent,
  modelCallLimitMiddleware,
  toolCallLimitMiddleware,
} from "langchain";
import z from "zod";
import { getChatModel } from "../../packages/models/models.js";
import { getUserProfile } from "./context-tool.js";
const AGENT_PROMPT = `You're an ai assistant`;
const model = getChatModel();
const devAssist = createAgent({
  model: model,
  tools: [getUserProfile],
  systemPrompt: AGENT_PROMPT,
  contextSchema: z.object({
    userId: z.string(),
  }),
  middleware: [
    modelCallLimitMiddleware({
      runLimit: 3,
    }),
    toolCallLimitMiddleware({
      toolName: "get_user_profile",
      runLimit: 5,
    }),
  ],
});
