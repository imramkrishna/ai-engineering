import type { Request, Response } from "express";
import { auth } from "../lib/auth.js";
import {
  conversationExists,
  deleteConversation,
  generateLangchainMessages,
  getMessages,
  listConversations,
  retrieveRelevantChunks,
  saveMessage,
} from "../lib/queries.js";
import { HumanMessage, SystemMessage } from "langchain";
import { getChatModel } from "../../../packages/models/models.js";
import { conversations, db, messages } from "../../../packages/db/index.js";
import rewriteNewPrompt from "../utils/promptAnalysis.js";
import { fullTextSearch, vectorSearch } from "../utils/search.js";
import generateStandaloneQuery from "../utils/promptAnalysis.js";
const chatModel = getChatModel();
export const chatController = async (req: Request, res: Response) => {
  const { conversationId, query } = req.body;
  const session = await auth.api.getSession({
    headers: new Headers(req.headers as Record<string, string>),
  });
  if (!session?.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }
  try {
    const conversation = await conversationExists(
      conversationId,
      session.user.id,
    );
    if (!conversation) {
      return res.status(402).json({
        success: false,
        message: "user not found",
      });
    }
    const previousMessages = await getMessages(conversationId);
    const analysedPrompt = await generateStandaloneQuery(
      previousMessages,
      query,
    );
    const vectorResults = await vectorSearch({
      question: analysedPrompt.standaloneQuery,
      userId: session.user.id,
      limit: 2,
    });
    const textResults = await fullTextSearch({
      queryText: analysedPrompt.standaloneQuery,
      currentUserId: session.user.id,
      limit: 2,
    });
    console.log("Vector Result :", vectorResults);
    console.log("Text Result : ", textResults);
    const history = generateLangchainMessages(previousMessages);
    const context = vectorResults
      .map((chunk, index) => `[Source ${index + 1}]\n${chunk.content}`)
      .join("\n\n");
    const response = await chatModel.invoke([
      new SystemMessage(
        "Answer using the supplied document context. " +
          "If the context does not answer the question, say so. " +
          "Cite supporting chunks using [Source 1], [Source 2], etc.",
      ),
      ...history,
      new HumanMessage(`Context:\n${context}\n\nQuestion:\n${query}`),
    ]);
    let sources = vectorResults.map((chunk, index) => ({
      source: `Source ${index + 1}`,
      documentId: chunk.documentId,
      documentName: chunk.documentName,
      metadata: chunk.metadata,
      similarity: chunk.similarity,
    }));
    await saveMessage(conversationId, "user", query);
    await saveMessage(conversationId, "assistant", response.content as string);
    return res.status(200).json({
      success: true,
      data: {
        conversationId,
        message: response.content,
        sources,
      },
    });
  } catch (error) {
    console.log("Error in the chat controller : ",error)
    return res.status(500).json({
      success: false,
      message: "Error while processing your request.",
    });
  }
};

export const listConversationsController = async (
  req: Request,
  res: Response,
) => {
  const session = await auth.api.getSession({
    headers: new Headers(req.headers as Record<string, string>),
  });

  if (!session?.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized.",
    });
  }

  try {
    const conversations = await listConversations(session.user.id);
    return res.status(200).json({
      success: true,
      conversations,
    });
  } catch (error) {
    console.error("Error listing conversations:", error);
    return res.status(500).json({
      success: false,
      message: "Error while listing conversations.",
    });
  }
};

export const getMessagesController = async (req: Request, res: Response) => {
  const conversationId = Array.isArray(req.params.conversationId)
    ? req.params.conversationId[0]
    : req.params.conversationId;

  if (!conversationId) {
    return res.status(400).json({
      success: false,
      message: "Conversation ID is required.",
    });
  }

  const session = await auth.api.getSession({
    headers: new Headers(req.headers as Record<string, string>),
  });

  if (!session?.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized.",
    });
  }

  try {
    const messages = await getMessages(conversationId);
    return res.status(200).json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return res.status(500).json({
      success: false,
      message: "Error while fetching messages.",
    });
  }
};

export const newChatController = async (req: Request, res: Response) => {
  const { query } = req.body;
  console.log("New Chat Request Received : ", query);
  try {
    const session = await auth.api.getSession({
      headers: new Headers(req.headers as Record<string, string>),
    });

    if (!session?.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized.",
      });
    }
    if (typeof query !== "string" || !query.trim()) {
      return res.status(400).json({
        success: false,
        message: "A valid query is required.",
      });
    }

    // 1. Create a new conversation for the authenticated user.
    const [conversation] = await db
      .insert(conversations)
      .values({
        userId: session.user.id,
        title: query.trim().slice(0, 100),
      })
      .returning({
        id: conversations.id,
      });

    const conversationId = conversation!.id;

    const chunks = await retrieveRelevantChunks({
      question: query.trim(),
      userId: session.user.id,
      limit: 5,
    });

    let answer: string;
    let sources: {
      source: string;
      documentId: string;
      documentName: string;
      metadata?: unknown;
      similarity: number;
    }[] = [];

    if (chunks.length === 0) {
      answer = "I couldn't find relevant information in your documents.";
    } else {
      // 4. Build the context.
      const context = chunks
        .map((chunk, index) => `[Source ${index + 1}]\n${chunk.content}`)
        .join("\n\n");

      // 5. Generate the answer.
      const response = await chatModel.invoke([
        new SystemMessage(
          "Answer using the supplied document context. " +
            "If the context does not answer the question, say so. " +
            "Cite supporting chunks using [Source 1], [Source 2], etc.",
        ),
        new HumanMessage(`Context:\n${context}\n\nQuestion:\n${query.trim()}`),
      ]);

      answer =
        typeof response.content === "string"
          ? response.content
          : JSON.stringify(response.content);

      sources = chunks.map((chunk, index) => ({
        source: `Source ${index + 1}`,
        documentId: chunk.documentId,
        documentName: chunk.documentName,
        metadata: chunk.metadata,
        similarity: chunk.similarity,
      }));
    }

    await saveMessage(conversationId, "user", query);
    await saveMessage(conversationId, "assistant", answer);

    // 7. Return the new conversation ID and response.
    return res.status(200).json({
      success: true,
      data: {
        conversationId,
        message: answer,
        sources,
      },
    });
  } catch (error) {
    console.error("Error creating chat:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
      console.error("Stack trace:\n", error.stack);
    } else {
      console.error("Non-Error thrown:", JSON.stringify(error, null, 2));
    }
    return res.status(500).json({
      success: false,
      message: "Error while processing your request.",
      ...(process.env.NODE_ENV !== "production"
        ? { error: error instanceof Error ? error.message : "Unknown error" }
        : {}),
    });
  }
};

export const deleteConversationController = async (
  req: Request,
  res: Response,
) => {
  const conversationId = Array.isArray(req.params.conversationId)
    ? req.params.conversationId[0]
    : req.params.conversationId;
  const session = await auth.api.getSession({
    headers: new Headers(req.headers as Record<string, string>),
  });

  if (!session?.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized.",
    });
  }

  if (!conversationId) {
    return res.status(400).json({
      success: false,
      message: "Conversation ID is required.",
    });
  }

  try {
    const deleted = await deleteConversation(conversationId, session.user.id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message:
          "Conversation not found or you don't have permission to delete it.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Conversation deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return res.status(500).json({
      success: false,
      message: "Error while deleting conversation.",
    });
  }
};
