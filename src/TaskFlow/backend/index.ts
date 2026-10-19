import { Command } from "@langchain/langgraph";
import taskFlowGraph from "./graph.js";
import { askQuestion } from "./utils/ask.js";

async function main() {
  const config = { configurable: { thread_id: "test_1" } };
  const result = await taskFlowGraph.invoke(
    {
      task: "Hello. send email",
    },
    config,
  );
  const state = await taskFlowGraph.getState(config);
  const pendingInterrupt = state.tasks.flatMap((task) => task.interrupts ?? []);
  if (pendingInterrupt.length > 0) {
    const answer = await askQuestion(pendingInterrupt[0]?.value);
    await taskFlowGraph.invoke(
      new Command({
        resume: answer,
      }),
      config,
    );
  }
}
main();
