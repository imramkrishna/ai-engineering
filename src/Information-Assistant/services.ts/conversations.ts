import { asc, eq } from "drizzle-orm";
import { db, conversations, messages } from "../../packages/db/index.js";
import { AIMessage, HumanMessage } from "langchain";

export async function conversationExists(id: string): Promise<boolean> {
  const conversation = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.id, id));
  if (!conversation) {
    return false;
  } else {
    return true;
  }
}
export async function updateConversationTitle(
  conversationId: string,
  title: string,
) {
  const updated = await db
    .update(conversations)
    .set({ title })
    .where(eq(conversations.id, conversationId))
    .returning();
  return updated[0];
}
export async function createNewConversation() {
  const newConversation = await db.insert(conversations).values({}).returning();
  return newConversation[0];
}
export async function getMessages(conversationId: string) {
  const allMessages = await db
    .select({ content: messages.content, role: messages.role })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));
  console.log("Messages : ", allMessages);
  return allMessages;
}

export async function saveMessage(
  conversationId: string,
  role: "assistant" | "user" | "tool_call",
  content: string,
) {
  const [message] = await db
    .insert(messages)
    .values({
      conversationId,
      role,
      content,
    })
    .returning();

  return message;
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
