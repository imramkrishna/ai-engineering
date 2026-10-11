import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import db from "../../packages/db/client.js";
import { documentChunks, documents } from "../../packages/db/index.js";
import {
  getChatModel,
  getEmbeddingsModel,
} from "../../packages/models/models.js";

const model = getChatModel();
const embeddingModel = getEmbeddingsModel();
const QueryFiltersSchema = z.object({
  docType: z.enum(["policy", "runbook", "contract", "any"]).default("any"),
  year: z
    .number()
    .int()
    .nullable()
    .describe("Only if the user mentions a specific year"),
  semanticQuery: z
    .string()
    .describe("The search question with all explicit filter words removed"),
});

export async function retrieveWithMetadataFilters(
  question: string,
  userId: string,
) {
  const filters = await model
    .withStructuredOutput(QueryFiltersSchema)
    .invoke(question);
  const conditions = [eq(documents.userId, userId)];

  if (filters.docType !== "any") {
    conditions.push(
      sql`${documentChunks.metadata}->>'docType' = ${filters.docType}`,
    );
  }
  if (filters.year !== null) {
    conditions.push(
      sql`(${documentChunks.metadata}->>'year')::int = ${filters.year}`,
    );
  }
  const queryVector = await embeddingModel.embedQuery(filters.semanticQuery);

  // 5. Execute vector search scoped by exact metadata constraints
  return await db
    .select()
    .from(documentChunks)
    .innerJoin(documents, eq(documentChunks.documentId, documents.id))
    .where(and(...conditions))
    .orderBy(
      sql`${documentChunks.embedding} <-> ${JSON.stringify(queryVector)}`,
    )
    .limit(5);
}
