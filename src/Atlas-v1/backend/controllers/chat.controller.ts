import type { Request, Response } from "express";
import { auth } from "../lib/auth.js";
import {
  conversationExists,
  generateLangchainMessages,
  getMessages,
  retrieveRelevantChunks,
  saveMessage,
} from "../lib/queries.js";
import { HumanMessage, SystemMessage } from "langchain";
import { getChatModel } from "../../../packages/models/models.js";
import { conversations, db, messages } from "../../../packages/db/index.js";
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
    const chunks = await retrieveRelevantChunks({
      question: query as string,
      userId: session.user.id as string,
      limit: 5,
    });
    if (chunks.length === 0) {
      return res.status(200).json({
        answer: "I couldn't find relevant information in your documents.",
        sources: [],
      });
    }

    const context = chunks
      .map((chunk, index) => `[Source ${index + 1}]\n${chunk.content}`)
      .join("\n\n");
    const history = generateLangchainMessages(previousMessages);
    const response = await chatModel.invoke([
      new SystemMessage(
        "Answer using the supplied document context. " +
          "If the context does not answer the question, say so. " +
          "Cite supporting chunks using [Source 1], [Source 2], etc.",
      ),
      ...history,
      new HumanMessage(`Context:\n${context}\n\nQuestion:\n${query}`),
    ]);
    let sources = chunks.map((chunk, index) => ({
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
        sources
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error while processing your request.",
    });
  }
};

export const newChatController = async (req: Request, res: Response) => {
  const { query } = req.body;

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
      page: number | null;
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

      let sources = chunks.map((chunk, index) => ({
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

    return res.status(500).json({
      success: false,
      message: "Error while processing your request.",
    });
  }
};
