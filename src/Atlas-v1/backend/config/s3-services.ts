import { PutObjectCommand } from "@aws-sdk/client-s3";
import { S3 } from "./s3.config.js";
import db from "../../../packages/db/client.js";
import { documents } from "../../../packages/db/index.js";

function generateKey(fileName: string): string {
  const timestamp = new Date()
    .toISOString()
    .replace("T", "-")
    .replace("/:/g", "-")
    .split(".")[0];
  return `${fileName}-${Math.floor(Math.random() * 1000)}-${timestamp}`;
}

export async function saveDocument(params: {
  name: string;
  userId: string;
  mimeType: string;
  size: number;
  storageKey: string;
}) {
  const { name, userId, mimeType, size, storageKey } = params;
  await db.insert(documents).values({
    name,
    userId,
    mimeType,
    size,
    storageKey,
  });
  console.log("Saved Document to the database : ", name, storageKey);
}
export async function uploadFileToS3(params: {
  bucket: string;
  body: Buffer | string | ReadableStream;
  fileName: string;
  mimetype?: string;
}): Promise<string> {
  const { bucket, body, mimetype, fileName } = params;
  const key = generateKey(fileName);
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: mimetype,
  });
  await S3.send(command);
  return key;
}

// export async function uploadFileFromRequest(
//   req: Request,
//   options?: { keyPrefix?: string },
// ): Promise<{ url: string; key: string; bucket: string }> {
//   const file = (req as any).file;
//   if (!file) {
//     throw new Error("No file found in request. Did you run multer middleware?");
//   }

//   const bucket = process.env.S3_BUCKET!;
//   if (!bucket) {
//     throw new Error("S3_BUCKET environment variable is not set.");
//   }

//   const keyPrefix = options?.keyPrefix ?? "uploads";
//   const key = `${keyPrefix}/${Date.now()}-${file.originalname}`;

//   const url = await uploadFileToS3({
//     bucket,
//     fileName,
//     body: file.buffer,
//     mimetype: file.mimetype,
//   });

//   return { url, key, bucket };
// }
