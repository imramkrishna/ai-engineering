import { Command } from "@langchain/langgraph";
import taskFlowGraph from "./graph.js";
import { askQuestion } from "./utils/ask.js";

async function main() {
  const config = { configurable: { thread_id: "test_1" } };
  const interrupted = await taskFlowGraph.invoke(
    {
      task: "Hello. send email",
    },
    config,
  );
  const interrupts = await (interrupted as any).__interrupt__;
  if (interrupts) {
    const answer = await askQuestion(interrupts[0].value);
    const finalResult = await taskFlowGraph.invoke(
      new Command({
        resume: answer,
      }),
      config,
    );
  }
}
main();
