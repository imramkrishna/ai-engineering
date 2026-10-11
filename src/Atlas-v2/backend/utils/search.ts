import { and, asc, cosineDistance, eq } from "drizzle-orm";
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

export async function fullTextSearch() {}

export async function reciprocalRankFusion() {}
