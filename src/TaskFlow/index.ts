import { Command } from "@langchain/langgraph";
import taskFlowGraph from "./graph.js";
import { askQuestion } from "./utils/ask.js";
import { generatePlan } from "./lib/ queries.js";

async function main() {
  const config = { configurable: { thread_id: "test_1" } };
  const query = await askQuestion("Enter Tasks : ");
  await taskFlowGraph.invoke(
    {
      query,
    },
    config,
  );
  const state = await taskFlowGraph.getState(config);
  const pendingInterrupts = state.tasks.flatMap(
    (task) => task.interrupts ?? [],
  );
  const interruptsResult = pendingInterrupts.map(async (pendingInterrupt) => {
    const answer = await askQuestion(pendingInterrupt.value);
    return new Command({
      resume: answer,
    });
  });
  console.log("Interrupt Result : ", interruptsResult);
}
main();
