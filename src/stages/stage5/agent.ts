import { createAgent } from "langchain";
import z from "zod";
import { searchDocuments } from "../stage4/tools/search-docs.js";
import { getChatModel } from "../../packages/models/models.js";
const AGENT_PROMPT = "You're an ai chat assistant.";
const chatModel=getChatModel()
const devAssist = createAgent({
  model: chatModel,
  tools: [searchDocuments],
  systemPrompt: AGENT_PROMPT,
  contextSchema: z.object({
    userId: z.string(),
  }),
  
});

const result = await devAssist.invoke(
  {
    messages: [{ role: "human", content: "HEy WHo is this? ALso list me all of my documents from the database" }],
  },
  {
    context: {
      userId: "fAM9GkvxnzQ74jIQMPNf2lhK0ioRGV07",
    },
  },
);
console.log(result.messages.map(m=>m.content))
