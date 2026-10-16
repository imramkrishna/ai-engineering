import z from "zod";

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