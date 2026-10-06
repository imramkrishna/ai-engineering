import express from "express";
import { chatController } from "./controller/chat.controller.js";

const app = express();
app.use(express.json());
app.get("/", (req, res) => {
  res.json({
    message: "Information Assitant Server is working.",
    timestamp: new Date().toLocaleString(),
  });
});
app.post("/conversations",chatController)
app.listen(3001, () => {
  console.log("Information Assitant Server running on http://localhost:3001");
});
