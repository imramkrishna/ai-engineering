import type {
  StructuredTool,
} from "@langchain/core/tools";
import { getChatModel } from "../../packages/models/models.js";
import { tools } from "./tools.js";
import { HumanMessage, ToolMessage } from "langchain";

const toolsByName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));

const chatModel = getChatModel().bindTools(tools);

async function main() {
  const userMessage = new HumanMessage(
    "What is the weather of Kathmandu and whats the current time right now?",
  );
  const toolMessages = [];
  const response = await chatModel.invoke([userMessage]);
  for (const toolCall of response.tool_calls ?? []) {
    const tool = toolsByName[toolCall.name];
    if (!tool) {
      console.log("Tool Not Found.");
      return;
    }
    const toolResult = await (tool as StructuredTool).invoke(toolCall.args);
    toolMessages.push(
      new ToolMessage({
        content: JSON.stringify(toolResult),
        tool_call_id: toolCall.id || "12",
      }),
    );
  }
  const streamStartTime = performance.now();
  console.log(
    "Stream Message : ",
    [userMessage, response, ...toolMessages],
    "\nend",
  );
  const stream = await chatModel.stream([
    userMessage,
    response,
    ...toolMessages,
  ]);
  for await (const chunk of stream) {
    if (!chunk.content) continue;
    console.log(chunk.content);
  }
  const streamEndTime = performance.now();
  console.log(
    "Stream Time -",
    (streamEndTime - streamStartTime).toFixed(2),
    "ms",
  );
}

main();
