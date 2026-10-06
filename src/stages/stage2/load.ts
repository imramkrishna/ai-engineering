import { PDFParse } from "pdf-parse";
import { readFile } from "node:fs/promises";
import { Document } from "langchain";
const buffer = await readFile(
  "./docs/Designing Distributed Systems, 2nd Edition Patterns and Paradigms for Scalable, Reliable Systems Using Kubernetes.pdf",
);
const parser = new PDFParse({
  data: buffer,
});

export async function getTextFromPDF() {
  const result = await parser.getText();
  await parser.destroy();
  return new Document({
    pageContent: result.text,
    metadata: {
      source: "Designing Distributed Systems, 2nd Edition",
    },
  });
}
