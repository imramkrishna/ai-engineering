import type { StructuredTool } from "@langchain/core/tools";
import { getChatModel } from "../../packages/models/models.js";
import { HumanMessage, ToolMessage } from "langchain";
import { tools } from "../stage0/tools.js";
import type { Request, Response } from "express";
const toolsByName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));

const chatModel = getChatModel().bindTools(tools);

export const toolController = async (req: Request, res: Response) => {
  const { query } = req.body;
  if (!query) {
    return res.status(404).json({
      success: false,
      message: "Query Not Found",
    });
  }
  try {
    const userMessage = new HumanMessage(query);
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
      break; //only one tool call is allowed
    }
    const stream = await chatModel.invoke([
      userMessage,
      response,
      ...toolMessages,
    ]);
    return res.status(200).json({
      success: true,
      data: stream.content,
    });
  } catch (error) {
    console.log("Error in tool call controller : ", error);
    res.status(500).json({
      success: false,
      message: "Error while processing your request.",
    });
  }
};
