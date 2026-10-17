import z from "zod";
import type { AtlasState } from "../state.js";

const Citation = z.object({
  sourceNumber: z.number().int().positive(),
  chunkId: z.string(),
  quote: z.string().min(1),
  documentId: z.string(),
  documentName: z.string(),
  pageNumber: z.number().int().positive().optional(),
  sectionPath: z.string().optional(),
});

const RAGAnswer = z.object({
  answer: z.string(),
  citations: z.array(Citation),
  abstained: z.boolean(),
});
function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}
export function verifyCitations(
  citations: Array<{ chunkId: string; quote: string }>,
  documents: (typeof AtlasState.State)["documents"],
) {
  const documentById = new Map(documents.map((d) => [d.chunkId, d]));
  return citations.map((citation) => {
    const document = documentById.get(citation.chunkId);
    if (!document) {
      return {
        ...citation,
        verified: false,
      };
    }
    const quoteExists = normalizeText(document.content).includes(
      normalizeText(citation.quote),
    );
    return {
      ...citation,
      verified: quoteExists,
    };
  });
}
