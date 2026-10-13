import {
  AIMessage,
  HumanMessage,
  StructuredTool,
  ToolMessage,
  type BaseMessage,
} from "langchain";
import { getChatModel } from "../../packages/models/models.js";
import makeToolsWithErrorHandler from "../stage4/error.js";
type SessionContext = {
  userId: string;
};

export async function runAgent(
  query: string,
  ctx: SessionContext,
  maxStep: number,
) {
  const model = getChatModel();
  const messages: BaseMessage[] = [];
  const tools = makeToolsWithErrorHandler({ userId: "fAM9GkvxnzQ74jIQMPNf2lhK0ioRGV07" });
  let toolByName = new Map(tools.map((t) => [t.name, t]));
  const llm = model.bindTools(tools);
  messages.push(new HumanMessage(query))
  for (let step = 0; step < maxStep; step++) {
    const ai = await llm.invoke(messages);
    messages.push(new AIMessage(ai.content));
    if (!ai.tool_calls?.length)
      return {
        message: ai.content,
        messages,
        steps: step + 1,
      };
    for (const tool_call of ai.tool_calls) {
      const tool = toolByName.get(tool_call.name) as StructuredTool;
      const result = await tool?.invoke(tool_call.args);
      messages.push(
        new ToolMessage({
          tool_call_id: tool_call.id as string,
          content: result,
        }),
      );
    }
  }
  return {
    answer: "I couldnot finish within step limit",
    messages,
    stepSize: maxStep,
  };
}
