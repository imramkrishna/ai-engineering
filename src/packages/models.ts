import dotenv from "dotenv";

import { ChatOpenRouter } from "@langchain/openrouter";
import { OpenAIEmbeddings } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

//Added path to avoid failure while executing the file from other terminal session other than its root dir which is ai-engineering
 
dotenv.config({ path: "/Users/ramkrishnayadav/ai-engineering/.env" });
const chatModel = process.env.CHAT_MODEL ?? "openrouter/free";

const embeddingModel =
  process.env.EMBEDDING_MODEL ?? "liquid/lfm-2.5-embedding-350m:free";

const apiKey = process.env.OPENROUTER_API_KEY as string;

if (!apiKey) {
  throw new Error("OPENROUTER_API_KEY is not set");
}
const googleApiKey = process.env.GEMINI_API_KEY as string;
const googleModel = process.env.GOOGLE_MODEL || "gemini-3.8-flash";
if (!googleApiKey) {
  console.warn(
    "Google API Key is Missing , Fallback/Backup model will not work.",
  );
}

export function getChatModel() {
  return new ChatOpenRouter({
    model: chatModel,
    apiKey,
    temperature: 1,
    maxRetries: 2,
  });
}

export function getEmbeddingsModel() {
  return new OpenAIEmbeddings({
    model: embeddingModel,
    apiKey,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
    },
  });
}

export function getBackupChatModel() {
  return new ChatGoogleGenerativeAI({
    apiKey: googleApiKey,
    model: googleModel,
  });
}
