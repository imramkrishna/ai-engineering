import { Worker } from "bullmq";
import { connection } from "./config/redis.config.js";
import processPdf from "./lib/processPdf.js";
import generateChunks from "./lib/chunks.js";
import { embedChunks } from "./lib/embed.js";
import db from "../../packages/db/client.js";
import {
  documentChunks,
  documents,
  ingestionJobs,
} from "../../packages/db/index.js";
import { eq } from "drizzle-orm";

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
      await db.transaction(async (tx) => {
        await tx.insert(documentChunks).values(rows);

        await tx
          .update(documents)
          .set({ status: "completed" })
          .where(eq(documents.id, documentId));
      });
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

worker.on("completed", (job) => {
  console.log(`✅ Job ${job.id} completed successfully! Result:`);
});

worker.on("failed", async (job, err) => {
  if (!job) return;

  const maxAttempts = job.opts.attempts ?? 1;
  const isFinalFailure = job.attemptsMade >= maxAttempts;

  console.error(`Job ${job.id} failed: ${err.message}`);

  if (isFinalFailure) {
    console.error("All attempts exhausted. Marking document as failed.");
    await db
      .update(documents)
      .set({ status: "completed" })
      .where(eq(documents.id, job.data.documentId));
  }
});

console.log("👷 Worker is running and waiting for jobs from Upstash...");
