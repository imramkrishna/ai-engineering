import { tool } from "@langchain/core/tools";
import { and, eq, ilike } from "drizzle-orm";
import z from "zod";
import db from "../../packages/db/client.js";
import { documents, tasks, user } from "../../packages/db/index.js";
import type { SessionContext } from "./types.js";

const searchDocuments = tool(
  async (input, config) => {
    try {
      return await db
        .select({
          id: documents.id,
          size: documents.size,
          name: documents.name,
          mimeType: documents.mimeType,
          storageKey: documents.storageKey,
        })
        .from(documents)
        .where(eq(documents.userId, config.context.userId));
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
  async (input, config) => {
    try {
      const userFound = await db
        .select({ name: user.name, email: user.email })
        .from(user)
        .where(eq(user.id, config.context.userId));
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
  async (input, config) => {
    try {
      return await db
        .select({
          id: documents.id,
          name: documents.name,
          mimeType: documents.mimeType,
          size: documents.size,
        })
        .from(documents)
        .where(
          and(
            eq(documents.userId, config.context.userId),
            ilike(documents.name, `%${input.name}%`),
          ),
        );
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
const queryDatabase = tool(
  async ({ entity, limit }, config) => {
    const context = config.context as SessionContext;

    if (entity === "documents") {
      return await db
        .select({
          id: documents.id,
          name: documents.name,
          mimeType: documents.mimeType,
        })
        .from(documents)
        .where(and(eq(documents.userId, context.userId)))
        .limit(limit);
    }
    if (entity === "users") {
      return await db
        .select({
          name: user.name,
          email: user.email,
        })
        .from(user)
        .where(eq(user.id, context.userId));
    }
    throw new Error(`Unsupported database entity: ${entity}`);
  },
  {
    name: "query_database",
    description:
      "Read structured records from the approved database entities. Never modify data.",
    schema: z.object({
      entity: z.enum(["documents", "users"]),
      limit: z.number().int().min(1).max(50).default(10),
    }),
  },
);
const createTask = tool(
  async ({ title, description }, config) => {
    const context = config.context as SessionContext;

    if (!["admin", "developer"].includes(context.role || "member")) {
      throw new Error("The current role cannot create tasks");
    }

    const [task] = await db
      .insert(tasks)
      .values({
        title,
        description,
        createdBy: context.userId,
      })
      .returning();

    return task;
  },
  {
    name: "create_task",
    description: "Create a task only when the user explicitly asks for one.",
    schema: z.object({
      title: z.string().min(1).max(200),
      description: z.string().min(1).max(5_000),
    }),
  },
);

export const databaseTools = [
  searchDocuments,
  searchDocumentsByName,
  getUserProfile,
  queryDatabase,
  createTask,
];
