import type { Request, Response } from "express";
import { HumanMessage } from "langchain";
import { getChatModel } from "../../packages/models.js";
import { chatModel } from "../models.js";
export const chatController = async (req: Request, res: Response) => {
  const { query } = req.body;
  if (!query) {
    res.status(402).json({
      success: true,
      message: "Query Not Found.Pass a Query",
    });
    return;
  }
  try {
    const message = new HumanMessage(query);
    const stream = await chatModel.stream([message]);
    for await (const chunk of stream) {
      if (!chunk.content) continue;
      console.log(chunk.content);
    }
  } catch (error) {
    console.log("Error in chat controller : ", error);
    res.status(500).json({
      success: false,
      message: "Error while processing your request.",
    });
  }
};
