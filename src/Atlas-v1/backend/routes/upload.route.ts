import { Router } from "express";
import { uploadDocumentsController } from "../controllers/upload.controller.js";

const uploadRouter = Router();

uploadRouter.post("/new-document", uploadDocumentsController);

export default uploadRouter;
