import { tool } from "langchain";
import db from "../../../packages/db/client.js";
import { documents } from "../../../packages/db/index.js";

export const searchDocuments = tool(
  async () => {
    const docs = await db
      .select({
        id: documents.id,
        size: documents.size,
        name: documents.name,
        mimeType: documents.mimeType,
        storageKey: documents.storageKey,
      })
      .from(documents);
    return docs;
  },
  {
    name: "search_documents",
    description:
      "Search the user's uploaded documents (policies, runbooks, specs). Use for questions about internal processes or anything the user has uploaded. Not for general programming knowledge.",
  },
);
