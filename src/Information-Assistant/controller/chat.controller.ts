import type { Request, Response } from "express";
import z from "zod";
import { getChatModel } from "../../packages/models/models.js";
import { HumanMessage, SystemMessage } from "langchain";
import {
  conversationExists,
  createNewConversation,
  generateLangchainMessages,
  getMessages,
  saveMessage,
  updateConversationTitle,
} from "../services.ts/conversations.js";
import {
  howToSystemPrompt,
  offTopicSystemPrompt,
  troubleshootingSystemPrompt,
} from "../prompt.js";
const classificationSchema = z.object({
  category: z.enum(["how-to", "troubleshooting", "off-topic"]),
});
const model = getChatModel();
const structuredModel = model.withStructuredOutput(classificationSchema);
export const chatController = async (req: Request, res: Response) => {
  let { query, conversationId } = req.body;
  if (!query) {
    return res.status(404).json({
      success: false,
      message: "Query Not Found.",
    });
  }
  try {
    let messages;
    if (!conversationId) {
      const newChat = await createNewConversation();
      conversationId = newChat!.id;
      const updatedTitle = await model.invoke([
        new HumanMessage(query),
        new SystemMessage(
          "Generate a conversation title for this query : " +
            query +
            " Make Sure the generate title is not long and is only upto 40 words",
        ),
      ]);
      const title = await updateConversationTitle(
        conversationId,
        updatedTitle.content as string,
      );
      console.log("New Conversation Created. : ", conversationId, title);
    } else {
      const conversation = await conversationExists(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: "Conversation Not Found.Invalid Conversation Id",
        });
      }
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
    if (structuredResponse.category == "how-to") {
      await saveMessage(conversationId, "user", query as string);
      const allMessages = await getMessages(conversationId);
      const history = generateLangchainMessages(allMessages);
      const response = await model.invoke([
        new SystemMessage(howToSystemPrompt),
        ...history,
      ]);
      console.log(response.content);
      await saveMessage(
        conversationId,
        "assistant",
        response.content as string,
      );
      return res.status(200).json({
        success: true,
        message: response.content,
      });
    } else if (structuredResponse.category == "troubleshooting") {
      await saveMessage(conversationId, "user", query as string);
      const allMessages = await getMessages(conversationId);
      const history = generateLangchainMessages(allMessages);
      const response = await model.invoke([
        new SystemMessage(troubleshootingSystemPrompt),
        ...history,
      ]);
      await saveMessage(
        conversationId,
        "assistant",
        response.content as string,
      );
      console.log(response.content);
      return res.status(200).json({
        success: true,
        message: response.content,
      });
    } else if (structuredResponse.category == "off-topic") {
      await saveMessage(conversationId, "user", query as string);
      const allMessages = await getMessages(conversationId);
      const history = generateLangchainMessages(allMessages);
      const response = await model.invoke([
        new SystemMessage(offTopicSystemPrompt),
        ...history,
      ]);
      await saveMessage(
        conversationId,
        "assistant",
        response.content as string,
      );
      console.log(response.content);
      return res.status(200).json({
        success: true,
        message: response.content,
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
