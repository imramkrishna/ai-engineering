import { getEmbeddingsModel } from "../../packages/models/models.js";
import { getSplittedChunks } from "./split.js";
const embeddingModel = getEmbeddingsModel();
const chunks = await getSplittedChunks();
const batchSize = 128; //openAI embedding model only supports upto 128 chunks once during embeddings
const embeddings = [];
for (let i = 0; i < chunks.length; i += batchSize) {
  const batch = chunks.slice(i, i + batchSize);
  const batchEmbeddings = await embeddingModel.embedDocuments(
    batch.map((chunk) => chunk.pageContent),
  );
  embeddings.push(...batchEmbeddings);
}
console.log(embeddings);
