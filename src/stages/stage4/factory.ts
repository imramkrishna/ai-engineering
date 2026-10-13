import { tool } from "@langchain/core/tools";
import z from "zod";
import db from "../../packages/db/client.js";
import { documents } from "../../packages/db/index.js";
import { eq } from "drizzle-orm";

type SessionContext = {
  userId: string;
};
export async function makeTools(ctx: SessionContext) {
  const listDocuments = tool(
    async () => {
      const documentList = await db
        .select({
          id: documents.id,
          size: documents.size,
          name: documents.name,
          mimeType: documents.mimeType,
          storageKey: documents.storageKey,
        })
        .from(documents)
        .where(eq(documents.userId, ctx.userId));
      return documentList;
    },
    {
      name: "search_and_list_documents",
      description:
        "Search the user's uploaded documents (policies, runbooks, specs). Use for questions about internal processes or anything the user has uploaded. Not for general programming knowledge",
      schema: z.object({}),
    },
  );
  const base = [listDocuments];
  return base;
}
