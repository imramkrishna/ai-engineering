import type { GraphNode } from "@langchain/langgraph";
import type { AtlasState } from "../state.js";
import { getChatModel } from "../../../packages/models/models.js";
const model = getChatModel();
export const rewriteQuery: GraphNode<typeof AtlasState> = async (s) => {
  const result = await model.invoke([
    {
      role: "system",
      content:
        "Rewrite the search query to find the missing information. Use different terms. Output only the query.",
    },
    {
      role: "human",
      content: `Previous Question : ${s.question} \n Previous Query:${s.searchQuery} \n What was missing : ${s.issues.join(";")}`,
    },
  ]);
  return {
    searchQuery: result.text.trim(),
    filters: s.retrievalAttempt >= 2 ? {} : s.filters,
  };
};
