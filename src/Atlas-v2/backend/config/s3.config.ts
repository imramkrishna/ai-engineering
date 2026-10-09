import { S3Client } from "@aws-sdk/client-s3";
import { env } from "../../../utils/getEnv.js";
export const S3 = new S3Client({
  region: "auto",
  endpoint: process.env.S3_API!,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID!,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
  },
});
