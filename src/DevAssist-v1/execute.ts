import {
  AIMessage,
  HumanMessage,
  StructuredTool,
  ToolMessage,
  type BaseMessage,
} from "langchain";
import { getChatModel } from "../packages/models/models.js";
import { makeTools } from "./tools/makeTools.js";
const tools = makeTools({ userId: "fAM9GkvxnzQ74jIQMPNf2lhK0ioRGV07" });
const model = getChatModel().bindTools(tools);
const history: BaseMessage[] = [];
const toolByName = new Map(tools.map((t) => [t.name, t]));
async function execute(message: string) {
  history.push(new HumanMessage(message));
  const ai = await model.invoke(history);
  history.push(new AIMessage(ai.content));

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
  return final.content;
}
export default execute;
