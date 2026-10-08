import type { Request, Response } from "express";
import upload from "../config/multer.config.js";

// Extend Express Request type to include multer's file property
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

export const uploadDocumentsController = async (
  req: Request,
  res: Response,
) => {
  try {
    console.log("Request Body : ",req.body)
    console.log("Request File : ", req.file);
    return res.status(200).json({
      message: "Upload Successful.",
    });
  } catch (error) {
    console.log("Error while uploading file", error);
    return res.status(500).json({
      message: "Error while uploading file",
    });
  }
};
