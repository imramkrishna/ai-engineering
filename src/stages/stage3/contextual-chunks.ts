import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "langchain";
import { PDFParse } from "pdf-parse";
import fs from "node:fs/promises";
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1200,
  chunkOverlap: 150,
  separators: ["\n## ", "\n# ", "\n\n", "\n", ". ", " ", ""],
});

export async function getTextFromPDF() {
  const buffer = await fs.readFile("./docs/deploymentbook.pdf");
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  await parser.destroy();
  const pages = result.pages ?? [];
  return pages.map(
    (page) =>
      new Document({
        pageContent: page.text,
        metadata: {
          source: "deploymentbook.pdf",
          page: page.num,
        },
      }),
  );
}
const pageDocuments = await getTextFromPDF();
const chunks = await splitter.splitDocuments(pageDocuments);
console.log(chunks)
