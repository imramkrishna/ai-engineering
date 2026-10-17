import { END, START, StateGraph } from "@langchain/langgraph";
import { AtlasState } from "./state.js";
import { analyzeQuery } from "./nodes/analyze.js";
import { finalize, insufficientContext } from "./nodes/finalize.js";
import { generate } from "./nodes/generate.js";
import { retrieve } from "./nodes/retrieve.js";
import { rewriteQuery } from "./nodes/rewriteQuery.js";
import { validate } from "./nodes/validate.js";
import { routeAfterRetrieval, routeAfterValidation } from "./nodes/routes.js";

const builder: StateGraph<typeof AtlasState> = new StateGraph(AtlasState);

builder
  .addNode("analyzeQuery", analyzeQuery)
  .addNode("retrieve", retrieve)
  .addNode("rewriteQuery", rewriteQuery)
  .addNode("generate", generate)
  .addNode("validate", validate)
  .addNode("finalize", finalize)
  .addNode("insufficientContext", insufficientContext)
  .addEdge(START, "analyzeQuery")
  .addEdge("analyzeQuery", "retrieve")
  .addConditionalEdges("retrieve", routeAfterRetrieval, {
    generate: "generate",
    rewriteQuery: "rewriteQuery",
    insufficientContext: "insufficientContext",
  })
  .addEdge("rewriteQuery", "retrieve")
  .addEdge("generate", "validate")
  .addConditionalEdges("validate", routeAfterValidation, {
    finalize: "finalize",
    generate: "generate",
    insufficientContext: "insufficientContext",
  })
  .addEdge("finalize", END)
  .addEdge("insufficientContext", END);

const atlasGraph: ReturnType<typeof builder.compile> = builder.compile();

export default atlasGraph;
