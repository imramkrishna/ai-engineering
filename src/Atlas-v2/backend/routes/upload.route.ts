import { Router } from "express";
import { deleteDocumentController, uploadDocumentsController } from "../controllers/upload.controller.js";
import { getUploadedDocuments } from "../controllers/upload.controller.js";
import upload from "../config/multer.config.js";

const uploadRouter = Router();

uploadRouter.post(
  "/new-document",
  upload.single("file"),
  uploadDocumentsController,
);

uploadRouter.get(
  "/documents",
  getUploadedDocuments,
);

uploadRouter.delete(
  "/document/:documentId",
  deleteDocumentController,
);

export default uploadRouter;
