import { END, MemorySaver, START, StateGraph } from "@langchain/langgraph";
import { TaskFlowState } from "./utils/types.js";
import { planNode } from "./nodes/plan.js";
import { executeStepNode } from "./nodes/executeStep.js";
import { replan } from "./nodes/replan.js";
import { routeAfterExecuteStep } from "./utils/route.js";

const checkPointer = new MemorySaver();
const builder: StateGraph<typeof TaskFlowState> = new StateGraph(TaskFlowState);

builder
  .addNode("plan", planNode)
  .addNode("executeStep", executeStepNode)
  .addNode("replan", replan)
  .addEdge(START, "plan")
  .addEdge("plan", "executeStep")
  .addEdge("replan", "executeStep")
  .addConditionalEdges("executeStep", routeAfterExecuteStep, [
    "executeStep",
    "replan",
    END,
  ]);

const taskFlowGraph: ReturnType<typeof builder.compile> = builder.compile({
  checkpointer: checkPointer,
});

export default taskFlowGraph;
