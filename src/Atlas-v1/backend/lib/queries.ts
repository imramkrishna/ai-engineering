import { and, asc, cosineDistance, desc, eq } from "drizzle-orm";
import db from "../../../packages/db/client.js";
import {
  conversations,
  documentChunks,
  documents,
  ingestionJobs,
  messages,
} from "../../../packages/db/index.js";
import { embeddingModel } from "../../../Prompt-Lab/models.js";
import { AIMessage, HumanMessage } from "langchain";

// ─── Document Queries ─────────────────────────────────────────────
export async function listDocuments(userId: string) {
  const docList = await db
    .select({
      id: documents.id,
      name: documents.name,
      mimeType: documents.mimeType,
      size: documents.size,
      storageKey: documents.storageKey,
      contentHash: documents.contentHash,
      status: documents.status,
      errorMessage: documents.errorMessage,
      chunkCount: documents.chunkCount,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
      processedAt: documents.processedAt,
    })
    .from(documents)
    .where(eq(documents.userId, userId))
    .orderBy(desc(documents.createdAt));
  return docList;
}

export async function conversationExists(
  conversationId: string,
  userId: string,
): Promise<boolean> {
  const conversation = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)));
  if (!conversation || conversation.length === 0) {
    return false;
  }
  return true;
}

export async function listConversations(userId: string) {
  const convList = await db
    .select({
      id: conversations.id,
      title: conversations.title,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
      userId: conversations.userId,
    })
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.createdAt));
  return convList;
}

export async function getMessages(conversationId: string) {
  const conversationMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));
  return conversationMessages;
}

export async function saveMessage(
  conversationId: string,
  role: "user" | "assistant",
  message: string,
) {
  await db
    .insert(messages)
    .values({
      role,
      conversationId,
      content: message,
    })
    .returning({ id: messages.id });
}

export async function retrieveRelevantChunks(params: {
  question: string;
  userId: string;
  limit?: number;
}) {
  const { question, userId, limit = 5 } = params;

  // 1. Embed the user's question.
  const questionEmbedding = await embeddingModel.embedQuery(question);

  // 2. Calculate cosine distance between each chunk
  //    embedding and the question embedding.
  const distance = cosineDistance(documentChunks.embedding, questionEmbedding);

  // 3. Retrieve the closest chunks from documents
  //    owned by this user.
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

  // 4. Convert distance into a similarity-like score.
  return chunks.map((chunk) => ({
    ...chunk,
    similarity: 1 - Number(chunk.distance),
  }));
}

export function generateLangchainMessages(
  allMessages: { content: string; role: string }[],
) {
  const history = allMessages.map((message) => {
    if (message.role === "user") {
      return new HumanMessage(message.content);
    }

    if (message.role === "assistant") {
      return new AIMessage(message.content);
    }

    throw new Error(`Unknown message role: ${message.role}`);
  });
  return history;
}

// ─── Delete Queries ────────────────────────────────────────────────

/**
 * Delete a conversation and all of its messages.
 * Messages are removed explicitly because the current foreign key does not
 * declare database-level cascade behavior.
 */
export async function deleteConversation(
  conversationId: string,
  userId: string,
): Promise<boolean> {
  const ownedConversation = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, userId),
      ),
    );

  if (ownedConversation.length === 0) {
    return false;
  }

  await db
    .delete(messages)
    .where(eq(messages.conversationId, conversationId));

  const deleted = await db
    .delete(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, userId),
      ),
    )
    .returning({ id: conversations.id });
  return deleted.length > 0;
}

/**
 * Delete a document and ALL associated data:
 * - document chunks (embeddings)
 * - ingestion jobs
 * - the document row itself
 *
 * The documentChunks and ingestionJobs tables have FKs with onDelete: "cascade",
 * so deleting the document row is enough. We delete explicitly for clarity
 * and to guarantee cleanup even if FK constraints are not enforced.
 */
export async function deleteDocument(
  documentId: string,
  userId: string,
): Promise<{ id: string; storageKey: string } | null> {
  const ownedDocument = await db
    .select({
      id: documents.id,
      storageKey: documents.storageKey,
    })
    .from(documents)
    .where(
      and(eq(documents.id, documentId), eq(documents.userId, userId)),
    );

  if (ownedDocument.length === 0) {
    return null;
  }

  // 1. Delete ingestion jobs for this document.
  await db
    .delete(ingestionJobs)
    .where(
      and(
        eq(ingestionJobs.documentId, documentId),
        eq(ingestionJobs.userId, userId),
      ),
    );

  // 2. Delete document chunks (embeddings) for this document.
  await db
    .delete(documentChunks)
    .where(eq(documentChunks.documentId, documentId));

  // 3. Delete the document itself after ownership was verified.
  const deleted = await db
    .delete(documents)
    .where(eq(documents.id, documentId))
    .returning({ id: documents.id, storageKey: documents.storageKey });

  return deleted[0] ?? null;
}
