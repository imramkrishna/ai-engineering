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
  question: string;
  userId: string;
  limit: number;
}) {
  const { question, userId, limit } = params;
  const textQuery = question.trim().split(/\s+/).filter(Boolean).join(" OR ");
  const results = await db
    .select({
      id: documentChunks.id,
      documentId: documentChunks.documentId,
      documentName: documents.name,
      content: documentChunks.content,
      metadata: documentChunks.metadata,
    })
    .from(documentChunks)
    // 1. Join the documents table using the foreign key
    .innerJoin(documents, eq(documentChunks.documentId, documents.id))
    .where(
      and(
        // 2. Filter by the user ID on the joined table
        eq(documents.userId, userId),
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
type SearchResult = {
  id: string;
  documentId: string;
  documentName?: string;
  content: string;
  metadata: unknown;
  similarity?: number;
};

type RankedResult = SearchResult & { score: number };

export function reciprocalRankFusion(
  vectorResults: SearchResult[],
  textResults: SearchResult[],
  limit = Math.max(vectorResults.length, textResults.length),
): RankedResult[] {
  const scores = new Map<
    string,
    { result: SearchResult; score: number }
  >();

  const addResults = (results: SearchResult[]) => {
    results.forEach((result, index) => {
      const score = 1 / (60 + index + 1);
      const existing = scores.get(result.id);

      if (existing) {
        existing.score += score;
        return;
      }

      scores.set(result.id, { result, score });
    });
  };

  addResults(vectorResults);
  addResults(textResults);

  return [...scores.values()]
    .sort((left, right) => right.score - left.score)
    .map(({ result, score }) => ({ ...result, score }))
    .slice(0, limit);
}

export async function hybridSearch(params: {
  question: string;
  userId: string;
  limit?: number;
}): Promise<RankedResult[]> {
  const { question, userId, limit = 5 } = params;
  const retrievalLimit = Math.max(limit, 5);

  const [vectorResults, textResults] = await Promise.all([
    vectorSearch({ question, userId, limit: retrievalLimit }),
    fullTextSearch({ question, userId, limit: retrievalLimit }),
  ]);

  return reciprocalRankFusion(vectorResults, textResults, limit);
}