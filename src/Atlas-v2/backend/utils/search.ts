import { and, asc, cosineDistance, desc, eq, sql } from "drizzle-orm";
import { getEmbeddingsModel } from "../../../packages/models/models.js";
import { db, documentChunks, documents } from "../../../packages/db/index.js";

const embeddingModel = getEmbeddingsModel();
export async function vectorSearch(params: {
  question: string;
  userId: string;
  limit?: number;
}) {
  const { question, userId, limit = 5 } = params;
  const questionEmbedding = await embeddingModel.embedQuery(question);

  const distance = cosineDistance(documentChunks.embedding, questionEmbedding);
  const chunks = await db
    .select({
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

export async function fullTextSearch(
  queryText: string,
  currentUserId: string,
  limit = 5,
) {
  const results = await db
    .select({
      id: documentChunks.id,
      documentId: documentChunks.documentId,
      content: documentChunks.content,
      metadata: documentChunks.metadata,
      rankScore: sql<number>`ts_rank_cd(${documentChunks.tsv}, websearch_to_tsquery('english', ${queryText}))`,
    })
    .from(documentChunks)
    // 1. Join the documents table using the foreign key
    .innerJoin(documents, eq(documentChunks.documentId, documents.id))
    .where(
      and(
        // 2. Filter by the user ID on the joined table
        eq(documents.userId, currentUserId),
        // 3. Perform the text match on the chunks table
        sql`${documentChunks.tsv} @@ websearch_to_tsquery('english', ${queryText})`,
      ),
    )
    .orderBy(desc(sql`rankScore`))
    .limit(limit);

  return results;
}

export async function reciprocalRankFusion() {}
