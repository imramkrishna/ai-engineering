import { and, asc, cosineDistance, desc, eq } from "drizzle-orm";
import db from "../../../packages/db/client.js";
import {
  conversations,
  documentChunks,
  documents,
  messages,
} from "../../../packages/db/index.js";
import { embeddingModel } from "../../../Prompt-Lab/models.js";
import { AIMessage, HumanMessage } from "langchain";

export async function conversationExists(
  conversationId: string,
  userId: string,
): Promise<boolean> {
  const conversation = await db.select().from(conversations);
  if (!conversation || conversation.length < 0) {
    return false;
  } else {
    return true;
  }
}

export async function getMessages(conversationId: string) {
  const conversationMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt));
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
