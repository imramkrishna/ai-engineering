import { Router } from "express";
import { uploadDocumentsController } from "../controllers/upload.controller.js";
import upload from "../config/multer.config.js";

const uploadRouter = Router();

uploadRouter.post(
  "/new-document",
  upload.single("file"),
  uploadDocumentsController,
);

export default uploadRouter;
