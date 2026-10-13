import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import researchAgent from "./research-agent.js";
const rl = readline.createInterface({ input, output });

const context = {
  userId: "fAM9GkvxnzQ74jIQMPNf2lhK0ioRGV07",
  role: "developer" as const,
};

async function runAgent() {
  while (true) {
    const query = await rl.question("Query : ");
    if (query === "exit") {
      console.log("Session Terminated.");
      rl.close();
      return;
    }

    try {
      const response = await researchAgent.invoke(
        {
          messages: [{ role: "user", content: query }],
        },
        {
          context,
          recursionLimit: 50,
        },
      );
      console.dir(response.structuredResponse, { depth: null });
    } catch (error) {
      console.error(
        "Error while processing your request:",
        error instanceof Error ? error.message : error,
      );
    }
  }
}

runAgent();
