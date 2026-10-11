import { Router } from "express";
import {
  chatController,
  deleteConversationController,
  getMessagesController,
  listConversationsController,
  newChatController,
} from "../controllers/chat.controller.js";

const chatRouter = Router();
chatRouter.post("/conversation/:id", chatController);
chatRouter.post("/new", newChatController);
chatRouter.get("/list", listConversationsController);
chatRouter.get("/conversation/:conversationId", getMessagesController);
chatRouter.delete("/conversation/:conversationId", deleteConversationController);
export default chatRouter;

