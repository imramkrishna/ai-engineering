import { and, asc, cosineDistance, desc, eq, sql } from "drizzle-orm";
import { getEmbeddingsModel } from "../../../packages/models/models.js";
import { db, documentChunks, documents } from "../../../packages/db/index.js";

const embeddingModel = getEmbeddingsModel();
export async function vectorSearch(params: {
  question: string;
  userId: string;
  limit: number;
}) {
  const { question, userId, limit } = params;
  const questionEmbedding = await embeddingModel.embedQuery(question);

  const distance = cosineDistance(documentChunks.embedding, questionEmbedding);
  const chunks = await db
    .select({
      id: documentChunks.id,
      content: documentChunks.content,
      metadata: documentChunks.metadata,
      documentId: documents.id,
      documentName: documents.name,
      distance,
    })
    .from(documentChunks)
    .innerJoin(documents, eq(documentChunks.documentId, documents.id))
    .where(and(eq(documents.userId, userId), eq(documents.status, "completed")))
    .orderBy(asc(distance))
    .limit(limit);
  return chunks.map((chunk) => ({
    ...chunk,
    similarity: 1 - Number(chunk.distance),
  }));
}

export async function fullTextSearch(params: {
  queryText: string;
  currentUserId: string;
  limit: number;
}) {
  const { queryText, currentUserId, limit } = params;
  const textQuery = queryText
  .trim()
  .split(/\s+/)
  .filter(Boolean)
  .join(" OR ");
  const results = await db
    .select({
      id: documentChunks.id,
      documentId: documentChunks.documentId,
      content: documentChunks.content,
      metadata: documentChunks.metadata,
    })
    .from(documentChunks)
    // 1. Join the documents table using the foreign key
    .innerJoin(documents, eq(documentChunks.documentId, documents.id))
    .where(
      and(
        // 2. Filter by the user ID on the joined table
        eq(documents.userId, currentUserId),
        // 3. Perform the text match on the chunks table
        sql`${documentChunks.tsv} @@ websearch_to_tsquery('english', ${textQuery})`,
      ),
    )
    .orderBy(
      desc(sql`
    ts_rank_cd(
      ${documentChunks.tsv},
      websearch_to_tsquery('english', ${textQuery})
    )
 `),
    )
    .limit(limit);

  return results;
}
type RankedResult = {
  id: string;
  documentId: string;
  documentName?: string;
  content: string;
  metadata: unknown;
};
export async function reciprocalRankFusion() {}
