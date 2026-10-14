import { END, START, StateGraph, StateSchema } from "@langchain/langgraph";
import z from "zod";
import { getChatModel } from "../../packages/models/models.js";
import { HumanMessage, SystemMessage } from "langchain";

const agentState = new StateSchema({
  message: z.string(),
  response: z.string().default(""),
});
const SUMMARIZE_SYSTEM_PROMPT = `The current message is long. Summarize it in few words upto 2-3 sentences.`;
const model = getChatModel();

async function ChatBot(state: typeof agentState.State) {
  const response = await model.invoke(state.message);
  return {
    response:
      typeof response.content == "string"
        ? response.content
        : JSON.stringify(response.content),
  };
}
async function summarize(state: typeof agentState.State) {
  console.log("Summarizing : ", state);
  const response = await model.invoke([
    new SystemMessage(SUMMARIZE_SYSTEM_PROMPT),
    new HumanMessage(state.message),
  ]);
  return {
    response:
      typeof response.content == "string"
        ? response.content
        : JSON.stringify(response.content),
  };
}
const graph = new StateGraph(agentState)
  .addNode("chatbot", ChatBot)
  .addNode("summarize", summarize)
  .addEdge(START, "chatbot")
  .addEdge("chatbot", "summarize")
  .addEdge("summarize", END)
  .compile();

const result = await graph.invoke({
  message: "Explain me langgraph",
});

console.log(result);
