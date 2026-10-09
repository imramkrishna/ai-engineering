import type { Request, Response } from "express";
import { saveDocument, uploadFileToS3 } from "../config/s3-services.js";
import { env } from "../../../utils/getEnv.js";
import { injestionQueue } from "../config/redis.config.js";
// Extend Express Request type to include multer's file property
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

export const uploadDocumentsController = async (
  req: Request,
  res: Response,
) => {
  try {
    console.log("Request File : ", req.file);
    if (!req.file) {
      return res.status(403).json({
        message: "File Upload Failed",
      });
    }
    const key = await uploadFileToS3({
      bucket: env.S3_BUCKET_NAME as string,
      body: req.file.buffer,
      fileName: req.file.originalname,
      mimetype: req.file.mimetype,
    });
    console.log("Uploaded Document to S3 : ", key);
    let storageKey = `${env.S3_PUBLIC_DEPLOYMENT_URL}/${key}`;
    const documentId = await saveDocument({
      name: req.file.originalname,
      userId: "1",
      mimeType: req.file.mimetype,
      size: req.file.size,
      storageKey: storageKey,
    });
    console.log("Saved Document in the database. ");
    console.log("Adding task to the queue : ");
    const job = await injestionQueue.add(
      `injest-document`,
      {
        documentId,
        storageKey,
      },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: 1000,
        removeOnFail: false,
      },
    );
    console.log("Job added to the queue : ", job);
    return res.status(200).json({
      message: "Upload Successful.",
      documentName: req.file.filename,
    });
  } catch (error) {
    console.log("Error while uploading file", error);
    return res.status(500).json({
      message: "Error while uploading file",
    });
  }
};
