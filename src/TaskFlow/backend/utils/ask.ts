import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "process";
export async function askQuestion(question: string) {
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(question);
  rl.close();
  return answer;
}
