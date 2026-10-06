import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { getTextFromPDF } from "./load.js";

export async function getSplittedChunks() {
  const pdfText = await getTextFromPDF();
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1200,
    chunkOverlap: 150,
  });
  const chunks = await splitter.splitDocuments([pdfText]);
  return chunks;
}
