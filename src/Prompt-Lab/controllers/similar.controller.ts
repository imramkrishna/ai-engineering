import type { Request, Response } from "express";
import { embeddingModel } from "../models.js";

function cosine(x: number[], y: number[]) {
  let dot = 0;
  let nx = 0;
  let ny = 0;

  for (let i = 0; i < x.length; i++) {
    dot += x[i]! * y[i]!;
    nx += x[i]! ** 2;
    ny += y[i]! ** 2;
  }

  return dot / (Math.sqrt(nx) * Math.sqrt(ny));
}

export const similarController = async (req: Request, res: Response) => {
  const { faqs } = req.body;
  const questions = faqs.trim().split(",");
  if (!faqs || !questions) {
    return res.status(404).json({
      success: false,
      message: "FAQS Not Found",
    });
  }
  try {
    const embeddingsResponse = await embeddingModel.embedDocuments(questions);
    let similarity = [];
    for (let i = 0; i < embeddingsResponse.length; i++) {
      for (let j = i + 1; j < embeddingsResponse.length; j++) {
        similarity.push({
          question1: questions[i],
          question2: questions[j],
          similarity: cosine(embeddingsResponse[i]!, embeddingsResponse[j]!),
        });
      }
    }
    const sortedResult = similarity.sort((a, b) => b.similarity - a.similarity);
    console.log(sortedResult)
    return res.status(200).json({
      success: true,
      data: {
        1: sortedResult[0],
        2: sortedResult[1],
        3: sortedResult[2],
      },
    });
  } catch (error) {
    console.log("Error in similar controller : ", error);
    res.status(500).json({
      success: false,
      message: "Error while processing your request.",
    });
  }
};
