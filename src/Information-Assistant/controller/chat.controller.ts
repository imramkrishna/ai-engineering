import type { Request, Response } from "express";
import z from "zod";
import { db, messages, conversations } from "../../packages/db/index.js";
import { getChatModel } from "../../packages/models/models.js";
import { HumanMessage } from "langchain";
import { createNewConversation } from "../services.ts/conversations.js";
const classificationSchema = z.object({
  category: z.enum(["how-to", "troubleshooting", "off-topic"]),
});
const model = getChatModel();
const structuredModel = model.withStructuredOutput(classificationSchema);
export const chatController = async (req: Request, res: Response) => {
  const { query, conversationId } = req.body;
  if (!query) {
    return res.status(404).json({
      success: false,
      message: "Query Not Found.",
    });
  }
  try {
    if (!conversationId) {
      const newChat=await createNewConversation()
    }
    const structuredResponse = await structuredModel.invoke([
      new HumanMessage(query),
    ]);
    const result = classificationSchema.safeParse(structuredResponse);
    if (!result.success) {
      console.log("Invalid Structured Response : ", structuredResponse);
      return res.status(422).json({
        success: false,
        message: "Validation Failed. Ask better query or message.",
      });
    }
    const response = await model.invoke([new HumanMessage(query)]);
  } catch (error) {
    console.log("Error in chat controller : ", error);
    return res.status(500).json({
      success: false,
      message: "Error while processing your request.",
    });
  }
};
