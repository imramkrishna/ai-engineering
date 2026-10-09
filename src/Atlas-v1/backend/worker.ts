import { Worker } from "bullmq";
import { connection } from "./config/redis.config.js";
import processPdf from "./lib/processPdf.js";
import generateChunks from "./lib/chunks.js";
import { embedChunks } from "./lib/embed.js";
import db from "../../packages/db/client.js";
import { documentChunks } from "../../packages/db/index.js";

const worker = new Worker(
  "injestion-queue",
  async (job) => {
    const { documentId, storageKey } = job.data;
    try {
      const documentText = await processPdf(storageKey, documentId);
      const chunks = await generateChunks(documentText);
      const embeddings = await embedChunks(chunks!);

      if (chunks?.length !== embeddings.length) {
        throw new Error("Chunk and embedding counts do not match");
      }

      const rows = chunks.map((chunk, index) => ({
        documentId,
        content: chunk.pageContent,
        chunkIndex: index,
        metadata: chunk.metadata ?? {},
        embedding: embeddings[index],
      }));
      await db.insert(documentChunks).values(rows);
      console.log("Chunk inserted into database for document : ", documentId);
    } catch (error) {
      console.error("Document ingestion error:", {
        documentId,
        attemptsMade: job.attemptsMade,
        error,
      });
      throw error;
    }
  },
  {
    connection,
  },
);

worker.on("completed", (job, returnvalue) => {
  console.log(`✅ Job ${job.id} completed successfully! Result:`, returnvalue);
});

worker.on("failed", (job, err) => {
  console.error(`❌ Job ${job} failed with error: ${err.message}`);
});

console.log("👷 Worker is running and waiting for jobs from Upstash...");
