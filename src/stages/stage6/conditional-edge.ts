import { END, START, StateGraph, StateSchema } from "@langchain/langgraph";
import z from "zod";
import { getChatModel } from "../../packages/models/models.js";

const State = new StateSchema({
  message: z.string(),
  response: z.string().default(""),
  category: z.enum(["greeting", "question"]),
});
const model = getChatModel();
async function routeMessage(input: typeof State.State) {
  return input.category === "greeting" ? "greeting" : "question";
}
async function queryClassifier(state: typeof State.State) {
  const response = await model.invoke([
    {
      role: "system",
      content: 'Classify the message as "greeting" or "question".',
    },
    {
      role: "user",
      content: state.message,
    },
  ]);
  const category =
    typeof response.content === "string"
      ? response.content.trim().toLowerCase()
      : "question";
  return {
    category: category === "greeting" ? "greeting" : "question",
    response: category,
  };
}
async function chat(state: typeof State.State) {
  const response = await model.invoke(state.message);
  return {
    response:
      typeof response.content == "string"
        ? response.content
        : JSON.stringify(response.content),
  };
}
const builder = new StateGraph(State);
builder
  .addNode("classifyMessage", queryClassifier)
  .addNode("greeting", async () => {
    return {
      response: `Hello! How can I help you?`,
    };
  })
  .addNode("question", chat)
  .addEdge(START, "classifyMessage")
  .addConditionalEdges("classifyMessage", routeMessage, [
    "greeting",
    "question",
  ])
  .addEdge("greeting", END)
  .addEdge("question", END);

const app = builder.compile();

const result = await app.invoke({
  message: "What is LLM?",
});

console.log(result);
