import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import type { Request, Response } from "express";
import { S3 } from "../config/s3.config.js";
import { saveDocument, uploadFileToS3 } from "../config/s3-services.js";
import { env } from "../../../utils/getEnv.js";
import { injestionQueue } from "../config/redis.config.js";
import { auth } from "../lib/auth.js";
import { deleteDocument, listDocuments } from "../lib/queries.js";
// Extend Express Request type to include multer's file property
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

export const uploadDocumentsController = async (
  req: Request,
  res: Response,
) => {
  const session = await auth.api.getSession({
    headers: new Headers(req.headers as Record<string, string>),
  });
  if (!session?.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }
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
      userId: session.user.id,
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

export const getUploadedDocuments=async(req:Request,res:Response)=>{
  const session = await auth.api.getSession({
    headers: new Headers(req.headers as Record<string, string>),
  });
  if (!session?.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }
  try {
    const documents = await listDocuments(session.user.id);
    return res.status(200).json({
      success: true,
      documents,
    });
  } catch (error) {
    console.log("Error fetching documents", error);
    return res.status(500).json({
      success: false,
      message: "Error while fetching documents",
    });
  }
};

/**
 * Delete a document (upload).
 * This controller removes:
 *   1. All ingestion jobs for the document (via deleteDocument query)
 *   2. All chunks and their embeddings for the document (via deleteDocument query)
 *   3. The document record itself (via deleteDocument query)
 *   4. The physical file from S3 storage (using storageKey from DB)
 */
export const deleteDocumentController = async (req: Request, res: Response) => {
  const documentId = Array.isArray(req.params.documentId)
    ? req.params.documentId[0]
    : req.params.documentId;
  const session = await auth.api.getSession({
    headers: new Headers(req.headers as Record<string, string>),
  });

  if (!session?.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized.",
    });
  }

  if (!documentId) {
    return res.status(400).json({
      success: false,
      message: "Document ID is required.",
    });
  }

  try {
    // Delete the record from the database (chunks, embeddings, ingestion jobs cascade).
    // This also returns the storageKey for S3 cleanup.
    const deleted = await deleteDocument(documentId, session.user.id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message:
          "Document not found or you don't have permission to delete it.",
      });
    }

    // Delete the physical file from S3 using the storageKey from the database.
    const storageKey = getS3ObjectKey(deleted.storageKey);
    await S3.send(
      new DeleteObjectCommand({
        Bucket: env.S3_BUCKET_NAME as string,
        Key: storageKey,
      }),
    );
    console.log(`Deleted S3 object: ${storageKey}`);

    return res.status(200).json({
      success: true,
      message: "Document and all associated chunks/embeddings deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting document:", error);
    return res.status(500).json({
      success: false,
      message: "Error while deleting document.",
    });
  }
};

function getS3ObjectKey(storageKey: string): string {
  try {
    const parsed = new URL(storageKey);
    return decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
  } catch {
    return storageKey.replace(/^\/+/, "");
  }
}
