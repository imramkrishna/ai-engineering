import { END, MemorySaver, START, StateGraph } from "@langchain/langgraph";
import { TaskFlowState } from "./utils/types.js";
import { sendEmailNode } from "./interrupts/sendEmailNode.js";

const checkPointer = new MemorySaver();
const builder: StateGraph<typeof TaskFlowState> = new StateGraph(TaskFlowState);

builder
  .addNode("send-email", sendEmailNode)
  .addEdge(START, "send-email")
  .addEdge("send-email", END);

const taskFlowGraph: ReturnType<typeof builder.compile> = builder.compile({
  checkpointer: checkPointer,
});

export default taskFlowGraph;
