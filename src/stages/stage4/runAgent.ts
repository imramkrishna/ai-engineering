import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import execute from "./execute.js";
const rl = readline.createInterface({ input, output });
async function runAgent() {
  try {
    const query = await rl.question("Query : ");
    if (query === "exit") {
      console.log("Session Terminated.");
      rl.close();
      return;
    }
    const response = await execute(query);
    console.log(response);
  } catch (error) {
    console.log("Error while Processing your request.");
  }
  runAgent();
}

runAgent();
