import { env } from "../../../utils/getEnv.js";
import { Redis } from "ioredis";
import { Queue } from "bullmq";

export const connection = new Redis(env.ATLASV1_REDIS_CONNECTION_URL!, {
  maxRetriesPerRequest: null,
});

export const injestionQueue = new Queue("injestion-queue", { connection });
