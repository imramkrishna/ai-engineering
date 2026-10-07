import express from "express";
import cors from "cors";
import chatRouter from "./routes/chat.route.js";
import uploadRouter from "./routes/upload.route.js";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
const app = express();
app.use(express.json());
app.use(
  cors({
    origin: ["*"],
    credentials: true,
  }),
);
app.all("/api/auth/*splat", toNodeHandler(auth));
app.use("/api/v1/chat", chatRouter);
app.use("/api/v1/upload", uploadRouter);

app.get("/", (req, res) => {
  res.json({
    message: "Atlas-v1 Backend Server working.",
    timestamp: new Date().toLocaleString(),
  });
});

app.listen(3002, () => {
  console.log("Atlas-v1 Backend Server running on http://localhost:3002");
});
