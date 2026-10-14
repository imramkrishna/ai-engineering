import { START, StateGraph, StateSchema } from "@langchain/langgraph";
import z from "zod";

const agentState = new StateSchema({
  message: z.string(),
  content: z.string().default(""),
});
const builder = new StateGraph(agentState);
async function main() {}
builder
  .addNode("retrievePDFs", main)
  .addNode("searchKnowledgeBase", main)
  .addNode("draft", main)
  .addEdge(START, "retrievePDFs")
  .addEdge(START, "searchKnowledgeBase")
  .addEdge(["retrievePDFs", "searchKnowledgeBase"], "draft");

const app = builder.compile();


