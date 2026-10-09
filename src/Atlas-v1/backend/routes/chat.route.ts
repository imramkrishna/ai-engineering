import { Router } from "express";
import {
  chatController,
  getMessagesController,
  listConversationsController,
  newChatController,
} from "../controllers/chat.controller.js";

const chatRouter = Router();
chatRouter.post("/conversation/:id", chatController);
chatRouter.post("/new", newChatController);
chatRouter.get("/list", listConversationsController);
chatRouter.get("/conversation/:conversationId", getMessagesController);
export default chatRouter;

