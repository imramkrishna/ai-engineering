import { StructuredTool } from "langchain";
import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { getChatModel } from "../../packages/models/models.js";
import { searchDocuments } from "./tools/search-docs.js";
import makeToolsWithErrorHandler from "./error.js";
const tools = makeToolsWithErrorHandler({
  userId: "fAM9GkvxnzQ74jIQMPNf2lhK0ioRGV07",
});
const model = getChatModel().bindTools(tools);

const toolByName = new Map(tools.map((t) => [t.name, t]));
let history: BaseMessage[] = [];
async function execute(message: string) {
  history.push(new HumanMessage(message));
  const ai = await model.invoke(history);
  history.push(new AIMessage(ai.content))

  for (const toolCall of ai.tool_calls ?? []) {
    const toolResult = await (
      toolByName.get(toolCall.name) as StructuredTool
    ).invoke(toolCall.args);
    history.push(
      new ToolMessage({
        content: JSON.stringify(toolResult),
        tool_call_id: toolCall.id ?? "",
      }),
    );
  }

  const final = await model.invoke(history);
  return final.content
}

export default execute