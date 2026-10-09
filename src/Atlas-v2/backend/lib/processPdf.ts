import { Document } from "langchain";
import { PDFParse } from "pdf-parse";
async function processPdf(url: string,documentId?:string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch PDF: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const parser = new PDFParse({
    data: buffer,
  });

  try {
    const result = await parser.getText();
    const pages = result.pages;
    const pageDocuments = pages.map((page, index) => {
      return new Document({
        pageContent: page.text,
        metadata: {
          pageNumber: page.num,
          source: url,
          documentId
        },
      });
    });
    return pageDocuments;
  } finally {
    await parser.destroy();
  }
}
export default processPdf;
