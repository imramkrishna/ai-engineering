import { tryCatch, Worker } from "bullmq";
import { connection } from "./config/redis.config.js";
import processPdf from "./lib/processPdf.js";
import generateChunksAndEmbeddings from "./lib/chunks.js";

const worker = new Worker(
  "injestion-queue",
  async (job) => {
    try {
      const { documentId, storageKey } = job.data;
      const documentText=await processPdf(storageKey)
      
    } catch (error) {

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
