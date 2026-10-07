import express from "express";
import cors from "cors";
const app = express();
app.use(express.json());
app.use(
  cors({
    origin: ["*"],
  }),
);
app.get("/", (req, res) => {
  res.json({
    message: "Atlas-v1 Backend Server working.",
    timestamp: new Date().toLocaleString(),
  });
});
app.listen(3002, () => {
  console.log("Atlas-v1 Backend Server running on http://localhost:3002");
});
