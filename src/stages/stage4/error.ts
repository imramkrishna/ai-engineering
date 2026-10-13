import { tool } from "@langchain/core/tools";
import db from "../../packages/db/client.js";
import { documents, user } from "../../packages/db/index.js";
import { eq } from "drizzle-orm";
import z from "zod";

type SessionContext = {
  userId: string;
};
function makeToolsWithErrorHandler(ctx: SessionContext) {
  const listDocuments = tool(
    async () => {
      try {
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
      } catch (error) {
        return `Error while executing tool : ${error}.`;
      }
    },
    {
      name: "search_and_list_documents",
      description:
        "Search the user's uploaded documents (policies, runbooks, specs). Use for questions about internal processes or anything the user has uploaded. Not for general programming knowledge",
      schema: z.object({}),
    },
  );
  const listUsers = tool(
    async () => {
      try {
        const usersList = await db
          .select({
            id: user.id,
            name: user.name,
            email: user.email,
          })
          .from(user);
        return usersList;
      } catch (error) {
        return `Error while executing tool : ${error}.`;
      }
    },
    {
      name: "search_and_list_users",
      description:
        "Search the userr details from the database and returns the list of users.",
    },
  );
  return [listDocuments, listUsers];
}

export default makeToolsWithErrorHandler;
