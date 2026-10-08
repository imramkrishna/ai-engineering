import { Router } from "express";
import {
  chatController,
  newChatController,
} from "../controllers/chat.controller.js";

const chatRouter = Router();
chatRouter.post("/:id", chatController);
chatRouter.post("/new", newChatController);

export default chatRouter;
