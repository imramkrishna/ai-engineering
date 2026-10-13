import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { runResearch } from "./structured-report.js";
const rl = readline.createInterface({ input, output });
async function runResearchAgent() {
  while (true) {
    const query = await rl.question("Query : ");
    if (query === "exit") {
      console.log("Session Terminated.");
      rl.close();
      return;
    }

    try {
      const response = await runResearch(query);
      console.dir(response, { depth: null });
    } catch (error) {
      console.error(
        "Error while processing your request:",
        error instanceof Error ? error.message : error,
      );
    }
  }
}

runResearchAgent();
