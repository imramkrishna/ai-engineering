import type { GraphNode } from "@langchain/langgraph";
import type { AtlasState } from "../state.js";
import { hybridSearch } from "../utils/search.js";

export const retrieve: GraphNode<typeof AtlasState> = async (state, config) => {
  const { userId } = config as { userId: string };
  const hybridSearchResult = await hybridSearch({
    userId,
    question: state.question,
    limit: 10,
  });
  let searchResult = hybridSearchResult.map((r) => {
    return {
        document
      content: r.content,
      metadata: r.metadata,
      score: r.score,
    };
  });
};
