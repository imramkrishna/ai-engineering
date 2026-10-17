import type { GraphNode } from "@langchain/langgraph";
import type { AtlasState } from "../state.js";
import { verifyCitations } from "../utils/citation.js";

export const validate: GraphNode<typeof AtlasState> = (s) => {
  const citations = verifyCitations(s.citations, s.documents);
  const invalidCitations = citations.filter((citation) => !citation.verified);
  return {
    citations,
    issues:
      invalidCitations.length > 0
        ? ["One or more generated citations do not match the retrieved documents."]
        : [],
  };
};
