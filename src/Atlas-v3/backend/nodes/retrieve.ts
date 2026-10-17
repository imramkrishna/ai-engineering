import type { GraphNode } from "@langchain/langgraph";
import type { AtlasState } from "../state.js";
import { hybridSearch } from "../utils/search.js";

export const retrieve: GraphNode<typeof AtlasState> = async (state, config) => {
  const userId = (config.configurable as { userId?: string } | undefined)
    ?.userId;
  if (!userId) {
    throw new Error("A userId is required to retrieve documents.");
  }

  const hybridSearchResult = await hybridSearch({
    userId,
    question: state.searchQuery || state.question,
    limit: 10,
  });
  return {
    documents: hybridSearchResult.map((d) => {
      return {
        chunkId: d.documentId,
        title: d.documentName ?? "Untitled",
        page: (d.metadata as { page: number | null }).page || null,
        content: d.content,
        score: d.score,
      };
    }),
    retrievalAttempt: state.retrievalAttempt + 1,
  };
};
