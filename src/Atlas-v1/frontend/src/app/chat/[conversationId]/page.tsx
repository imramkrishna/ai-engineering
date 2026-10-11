"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Plus, ArrowLeft, Check, X as XIcon } from "lucide-react";
import { toast } from "sonner";
import { conversationsApi } from "@/lib/api/client";
import type { Conversation, Message } from "@/types";
import { shortId } from "@/lib/utils";
import { useAuth } from "@/lib/auth/context";
import { EmptyState, Skeleton } from "@/components/ui";
import { ChatMessage, ChatInput, ScrollToBottom, ConversationItem } from "@/components/chat";
import Link from "next/link";

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const conversationId = params.conversationId as string;

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  // Inline rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        // Load conversation details (falls back to API list match)
        const conv = await conversationsApi.get(conversationId);
        setConversation(conv);

        // Load messages for this conversation from the real API
        const msgs = await conversationsApi.getMessages(conversationId);
        setMessages(msgs);

        // For sidebar, load all conversations from the real API list endpoint
        const convs = await conversationsApi.list();
        setConversations(convs);

        // If get() returned null, try to find title from list
        if (!conv) {
          const found = convs.find((c) => c.id === conversationId) ?? null;
          setConversation(found);
        }
      } catch (error) {
        console.error("Failed to load conversation:", error);
        setConversation(null);
        setMessages([]);
        setConversations([]);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [conversationId]);

  // Focus rename input when it opens
  useEffect(() => {
    if (renamingId) {
      setTimeout(() => renameInputRef.current?.focus(), 50);
    }
  }, [renamingId]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 150);
  };

  const handleSend = async (content: string) => {
    // Optimistic user message
    const optimisticUser: Message = {
      id: shortId(),
      conversationId,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    // Streaming placeholder
    const streamPlaceholder: Message = {
      id: shortId(),
      conversationId,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      isStreaming: true,
    };

    setMessages((m) => [...m, optimisticUser, streamPlaceholder]);
    setIsSending(true);

    try {
      const response = await conversationsApi.sendMessage(conversationId, { content });
      const fullMessage = response.message;
      const fullText = fullMessage.content || "";

      // Stream the response words smoothly with live typing effect
      const words = fullText.split(" ");
      if (words.length <= 4) {
        setMessages((m) => {
          const without = m.filter((x) => x.id !== streamPlaceholder.id);
          return [...without, fullMessage];
        });
      } else {
        let currentWordCount = 1;
        const totalWords = words.length;
        const stepTime = Math.max(16, Math.min(40, Math.floor(1600 / totalWords)));

        await new Promise<void>((resolve) => {
          const interval = setInterval(() => {
            currentWordCount += Math.max(1, Math.floor(totalWords / 45));
            if (currentWordCount >= totalWords) {
              clearInterval(interval);
              setMessages((m) => {
                const without = m.filter((x) => x.id !== streamPlaceholder.id);
                return [...without, fullMessage];
              });
              resolve();
            } else {
              const partialContent = words.slice(0, currentWordCount).join(" ");
              setMessages((m) =>
                m.map((msg) =>
                  msg.id === streamPlaceholder.id
                    ? { ...msg, content: partialContent }
                    : msg
                )
              );
              scrollToBottom();
            }
          }, stepTime);
        });
      }

      // Update conversation title if it's the first message (server-driven)
      if (messages.length === 0 && conversation) {
        const title = content.length > 50 ? content.substring(0, 50) + "…" : content;
        setConversation((prev) => (prev ? { ...prev, title } : prev));
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId ? { ...c, title, updatedAt: new Date().toISOString() } : c
          )
        );
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages((m) => m.filter((x) => !x.isStreaming));
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleNew = async () => {
    try {
      const response = await conversationsApi.newChat({ content: "New conversation" });
      const newConvId = response.data?.conversationId;
      if (!newConvId) {
        throw new Error("No conversation ID returned from backend");
      }
      const newConversation: Conversation = {
        id: newConvId,
        title: "New conversation",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: user?.id ?? "",
      };

      setConversations((prev) => [newConversation, ...prev]);
      router.push(`/chat/${newConvId}`);
    } catch (error) {
      console.error("Failed to create new conversation:", error);
      toast.error("Failed to create a new conversation.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await conversationsApi.delete(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      toast.success("Conversation deleted");

      if (id === conversationId) {
        router.push("/chat");
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete conversation");
    }
  };

  const startRename = (id: string) => {
    const current = conversations.find((c) => c.id === id);
    setRenameValue(current?.title ?? "");
    setRenamingId(id);
  };

  const commitRename = async () => {
    if (!renamingId) return;
    const title = renameValue.trim();
    if (!title) {
      setRenamingId(null);
      return;
    }

    setConversations((prev) =>
      prev.map((c) =>
        c.id === renamingId ? { ...c, title, updatedAt: new Date().toISOString() } : c
      )
    );

    if (renamingId === conversationId) {
      setConversation((prev) => (prev ? { ...prev, title } : prev));
    }

    setRenamingId(null);
    // TODO: persist via API once a rename/PATCH endpoint exists
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue("");
  };

  return (
    <div className="h-full flex">
      {/* Conversation Sidebar */}
      <div
        className="hidden md:flex w-64 flex-shrink-0 flex-col border-r h-full"
        style={{ borderColor: "var(--border-subtle)", background: "var(--bg-sidebar)" }}
      >
        <div className="p-3 flex-shrink-0" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <button
            onClick={handleNew}
            className="atlas-btn atlas-btn-secondary w-full justify-center gap-2"
            style={{ fontSize: "13px", height: 34 }}
          >
            <Plus size={14} strokeWidth={2.5} />
            New conversation
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} style={{ height: 32, borderRadius: 8, margin: "2px 0" }} />
              ))
            : conversations.map((conv) =>
                renamingId === conv.id ? (
                  /* Inline rename input */
                  <div
                    key={conv.id}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg"
                    style={{ background: "var(--bg-active)" }}
                  >
                    <input
                      ref={renameInputRef}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename();
                        if (e.key === "Escape") cancelRename();
                      }}
                      className="flex-1 min-w-0 bg-transparent outline-none text-[13px]"
                      style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}
                    />
                    <button
                      onClick={commitRename}
                      className="p-0.5 rounded transition-colors"
                      style={{ color: "var(--accent-primary)" }}
                      aria-label="Confirm rename"
                    >
                      <Check size={13} strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={cancelRename}
                      className="p-0.5 rounded transition-colors"
                      style={{ color: "var(--text-muted)" }}
                      aria-label="Cancel rename"
                    >
                      <XIcon size={13} />
                    </button>
                  </div>
                ) : (
                  <ConversationItem
                    key={conv.id}
                    conversation={conv}
                    isActive={conv.id === conversationId}
                    onSelect={() => router.push(`/chat/${conv.id}`)}
                    onDelete={() => handleDelete(conv.id)}
                    onRename={() => startRename(conv.id)}
                  />
                )
              )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Top bar */}
        <div
          className="flex items-center gap-3 px-5 flex-shrink-0"
          style={{ height: 52, borderBottom: "1px solid var(--border-subtle)" }}
        >
          <Link href="/chat" className="md:hidden p-1 -ml-1" style={{ color: "var(--text-muted)" }}>
            <ArrowLeft size={18} />
          </Link>
          <span
            className="font-semibold truncate"
            style={{
              color: "var(--text-primary)",
              fontSize: "15px",
              letterSpacing: "-0.02em",
            }}
          >
            {isLoading ? (
              <Skeleton style={{ height: 18, width: 160, display: "inline-block" }} />
            ) : (
              conversation?.title ?? "Conversation"
            )}
          </span>
        </div>

        {/* Messages */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto py-6 flex flex-col gap-4 relative max-w-4xl w-full mx-auto px-4"
        >
          {isLoading ? (
            <div className="flex flex-col gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={`flex gap-3 ${i % 2 === 0 ? "flex-row-reverse" : ""}`}>
                  <Skeleton className="w-8 h-8 rounded-full" style={{ flexShrink: 0 }} />
                  <div className="flex flex-col gap-2 max-w-md">
                    <Skeleton style={{ height: 16, width: i % 2 === 0 ? "180px" : "300px" }} />
                    <Skeleton style={{ height: 16, width: "240px" }} />
                    {i % 2 !== 0 && <Skeleton style={{ height: 16, width: "200px" }} />}
                  </div>
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center min-h-[60vh]">
              <EmptyState
                title="Ask a question"
                description="Type below to query your indexed documents."
              />
            </div>
          ) : (
            messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onRegenerate={msg.role === "assistant" ? () => {} : undefined}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <ScrollToBottom onClick={scrollToBottom} visible={showScrollBtn} />

        {/* Input */}
        <ChatInput onSend={handleSend} isLoading={isSending} />
      </div>
    </div>
  );
}
