import { eq } from "drizzle-orm";
import { db, conversations, messages } from "../../packages/db/index.js";

async function conversationExists(id: string): Promise<boolean> {
  const conversation = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id));
  if (!conversation) {
    return false;
  } else {
    return true;
  }
}
async function getMessages(conversationId: string) {
  const allMessages = await db
    .select()
    .from(messages)
    .where(eq(conversations.id, conversationId));
  return allMessages;
}

async function saveMessage(
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
