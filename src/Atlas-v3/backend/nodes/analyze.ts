import type { GraphNode } from "@langchain/langgraph";
import { AtlasState } from "../state.js";
import { chatModel } from "../model.js";
import { HumanMessage, SystemMessage } from "langchain";

const SYSTEM_PROMPT = `Classify the message as "lookup" or "compare" or "chitchat". Just Give one word answer and classify the answer.`;

function parseResult(result: string) {
  switch (result) {
    case "lookup":
      return "lookup";
    case "compare":
      return "compare";
    case "chitchat":
      return "chitchat";
    default:
      return "lookup";
  }
}

export const analyzeQuery: GraphNode<typeof AtlasState> = async (state) => {
  const result = await chatModel.invoke([
    new SystemMessage(SYSTEM_PROMPT),
    new HumanMessage(state.question),
  ]);

  const parsed = parseResult(JSON.stringify(result.content));
  return {
    intent: parsed,
  };
};
