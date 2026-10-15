import { END, START, StateGraph, StateSchema } from "@langchain/langgraph";
import z from "zod";
import { TriageState } from "./types.js";
import { classifyTicket } from "./nodes/classify.js";
import { draftReply } from "./nodes/draftReply.js";
import { reviewReply } from "./nodes/reviewReply.js";
import { routeAfterReview } from "./nodes/routeAfterReview.js";
const builder = new StateGraph(TriageState);
builder
  .addNode("classify", classifyTicket)
  .addNode("draftReply", draftReply)
  .addNode("reviewReply", reviewReply)
  .addEdge(START, "classify")
  .addEdge("classify", "draftReply")
  .addEdge("draftReply", "reviewReply")
  .addConditionalEdges("reviewReply", routeAfterReview, [END, "draftReply"]);

const app = builder.compile();

console.log(
  await app.invoke({
    ticket: "Have i paid twice? Can you check? Passenger No.123EDFE",
  }),
);
