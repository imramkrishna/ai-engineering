import { tool } from "@langchain/core/tools";
import { eq, ilike } from "drizzle-orm";
import z from "zod";
import db from "../../packages/db/client.js";
import { documents, user } from "../../packages/db/index.js";
import type { SessionContext } from "./types.js";

export function makeDatabaseTools(ctx: SessionContext) {
  const searchDocuments = tool(
    async () => {
      try {
        return await db
          .select({
            id: documents.id,
            size: documents.size,
            name: documents.name,
            mimeType: documents.mimeType,
            storageKey: documents.storageKey,
          })
          .from(documents);
      } catch (error) {
        console.error("Searching uploaded documents failed.", error);
        return "Searching uploaded documents failed.";
      }
    },
    {
      name: "search_documents",
      description:
        "Search the user's uploaded documents (policies, runbooks, specs). Use for questions about internal processes or anything the user has uploaded. Not for general programming knowledge.",
    },
  );

  const getUserProfile = tool(
    async () => {
      try {
        const userFound = await db
          .select({ name: user.name, email: user.email })
          .from(user)
          .where(eq(user.id, ctx.userId));
        return userFound[0];
      } catch (error) {
        console.error("Fetching the user profile failed.", error);
        return "Fetching the user profile failed.";
      }
    },
    {
      name: "get_user_profile",
      description: "Get the user's details (name and email).",
    },
  );

  const searchDocumentsByName = tool(
    async ({ name }) => {
      try {
        return await db
          .select({
            id: documents.id,
            name: documents.name,
            mimeType: documents.mimeType,
            size: documents.size,
          })
          .from(documents)
          .where(ilike(documents.name, `%${name}%`));
      } catch (error) {
        console.error("Searching documents by name failed.", error);
        return "Searching documents by name failed.";
      }
    },
    {
      name: "search_documents_by_name",
      description:
        "Read-only search for the user's uploaded documents by filename. This tool cannot modify database records.",
      schema: z.object({
        name: z.string().min(1).describe("Text to search for in document names."),
      }),
    },
  );

  return [searchDocuments, getUserProfile, searchDocumentsByName];
}
