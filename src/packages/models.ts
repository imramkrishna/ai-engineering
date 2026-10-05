import "dotenv/config";

import { ChatOpenRouter } from "@langchain/openrouter";
import { OpenAIEmbeddings } from "@langchain/openai";

const chatModel = process.env.CHAT_MODEL ?? "openrouter/free";

const embeddingModel =
  process.env.EMBEDDING_MODEL ?? "liquid/lfm-2.5-embedding-350m:free";

const apiKey = process.env.OPENROUTER_API_KEY as string;

if (!apiKey) {
  throw new Error("OPENROUTER_API_KEY is not set");
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
