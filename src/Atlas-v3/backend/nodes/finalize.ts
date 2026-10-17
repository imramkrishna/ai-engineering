import type { GraphNode } from "@langchain/langgraph";
import type { AtlasState } from "../state.js";
import { AIMessage } from "langchain";

export const finalize: GraphNode<typeof AtlasState> = async (s) => {
  return {
    messages: [
      new AIMessage({
        content: s.answer,
        response_metadata: {
          citations: s.citations,
        },
      }),
    ],
  };
};

export const insufficientContext: GraphNode<typeof AtlasState> = async (s) => {
  return {
    messages: [
      new AIMessage({
        content:
          "I couldn't find enough reliable information in the provided documents to answer this question.",
        response_metadata: {
          citations: s.citations,
          fallback: true,
        },
      }),
    ],
  };
};
