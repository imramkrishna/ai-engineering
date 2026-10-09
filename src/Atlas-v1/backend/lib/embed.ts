import type { Document } from "langchain";
import { getEmbeddingsModel } from "../../../packages/models/models.js";

const embeddingModel = getEmbeddingsModel();
export async function embedChunks(chunks: Document[]) {
  const batchSize = 128;
  const embeddings = [];
  for (let i = 0; i < chunks.length; i += batchSize) {
    let batch = chunks.slice(i, i + batchSize);
    let batchEmbeddings = await embeddingModel.embedDocuments(
      batch.map((chunk) => chunk.pageContent),
    );
    embeddings.push(...batchEmbeddings);
  }
  return embeddings
}
