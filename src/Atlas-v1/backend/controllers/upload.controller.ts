import type { Request, Response } from "express";
import upload from "../config/multer.config.js";

export const uploadDocumentsController = async (
  req: Request,
  res: Response,
) => {
  try {
    // Use multer middleware to handle file upload
    upload.single('file')(req, res, (err: string | null) => {
      if (err) {
        return res.status(400).json({
          message: "File upload failed.",
          error: err,
        });
      }

      if (!req.file) {
        return res.status(400).json({
          message: "No file uploaded.",
        });
      }

      const file = req.file;
      const fileUrl = `/uploads/${file.filename}`;

      return res.status(200).json({
        message: "File uploaded successfully.",
        file: {
          filename: file.filename,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          url: fileUrl,
        },
      });
    });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({
      message: "Internal server error.",
    });
  }
};
