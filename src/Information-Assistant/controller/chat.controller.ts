import type { Request, Response } from "express";
import z from "zod";
import { db, messages, conversations } from "../../packages/db/index.js";
import { getChatModel } from "../../packages/models/models.js";
import { HumanMessage } from "langchain";
const classificationSchema = z.object({
  category: z.enum(["how-to", "troubleshooting", "off-topic"]),
});
const model = getChatModel();
const structuredModel = model.withStructuredOutput(classificationSchema);
export const chatController = async (req: Request, res: Response) => {
  const { query } = req.body;
  if (!query) {
    return res.status(404).json({
      success: false,
      message: "Query Not Found.",
    });
  }
  try {
    const response = await structuredModel.invoke([new HumanMessage(query)]);
    const result = classificationSchema.safeParse(response);
    if (!result.success) {
      console.log("Invalid Strcutred Response : ", response);
      return res.status(422).json({
        success: false,
        message: "Validation Failed. Ask better query or message.",
      });
    }
    
  } catch (error) {
    console.log("Error in chat controller : ", error);
    return res.status(500).json({
      success: false,
      message: "Error while processing your request.",
    });
  }
};
