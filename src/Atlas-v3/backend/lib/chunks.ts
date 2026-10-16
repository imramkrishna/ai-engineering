import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import type { Document } from "langchain";
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1200,
  chunkOverlap: 150,
  separators: ["\n\n", "\n", ".", "?", "!", " ", ""],
});
async function generateChunks(documentText: Document[]) {
  try {
    const chunks = await splitter.splitDocuments(documentText);
    return chunks;
  } catch (error) {
    console.log("Erorr while generating chunks :", error);
  }
}
export default generateChunks;
