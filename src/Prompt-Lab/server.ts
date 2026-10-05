import express from "express";
import { chatController } from "./controllers/chat.controller.js";
import { extractController } from "./controllers/extract.controller.js";
import { similarController } from "./controllers/similar.controller.js";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Prompt Lab Server is working.",
    timestamp: new Date().toLocaleString(),
  });
});
app.post("/chat", chatController);

app.post("/extract", extractController);

app.post("/tools", async (req, res) => {});

app.post("/similar", similarController);

app.listen(3000, () => {
  console.log("Prompt Lab running on http://localhost:3000");
});
