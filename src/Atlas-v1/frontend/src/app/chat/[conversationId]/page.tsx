"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Plus, ArrowLeft } from "lucide-react";
import { mockConversationsApi } from "@/lib/mock";
import type { Conversation, Message } from "@/types";
import { shortId } from "@/lib/utils";
import { EmptyState, Skeleton } from "@/components/ui";
import { ChatMessage, ChatInput, ScrollToBottom, ConversationItem } from "@/components/chat";
import Link from "next/link";

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.conversationId as string;

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const [conv, convs, msgs] = await Promise.all([
        mockConversationsApi.get(conversationId),
        mockConversationsApi.list(),
        mockConversationsApi.getMessages(conversationId),
      ]);
      setConversation(conv);
      setConversations(convs);
      setMessages(msgs);
      setIsLoading(false);
    };
    load();
  }, [conversationId]);

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
      const response = await mockConversationsApi.sendMessage(conversationId, content);
      setMessages((m) => {
        const without = m.filter((x) => !x.isStreaming);
        return [...without, response.message];
      });
    } catch {
      setMessages((m) => m.filter((x) => !x.isStreaming));
    } finally {
      setIsSending(false);
    }
  };

  const handleNew = async () => {
    const conv = await mockConversationsApi.create();
    router.push(`/chat/${conv.id}`);
  };

  const handleDelete = async (id: string) => {
    await mockConversationsApi.delete(id);
    setConversations((c) => c.filter((x) => x.id !== id));
    if (id === conversationId) router.push("/chat");
  };

  const handleRename = async (id: string) => {
    const title = prompt("New conversation name:");
    if (!title) return;
    const updated = await mockConversationsApi.rename(id, title);
    setConversations((c) => c.map((x) => (x.id === id ? updated : x)));
    if (id === conversationId) setConversation((c) => c ? { ...c, title } : c);
  };

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <div
        className="hidden md:flex w-64 flex-shrink-0 flex-col border-r h-full"
        style={{ borderColor: "var(--border-subtle)", background: "var(--bg-sidebar)" }}
      >
        <div className="p-3 flex-shrink-0" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <button onClick={handleNew} className="atlas-btn atlas-btn-secondary w-full justify-center text-xs">
            <Plus size={14} /> New conversation
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5">
          {conversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isActive={conv.id === conversationId}
              onSelect={() => router.push(`/chat/${conv.id}`)}
              onDelete={() => handleDelete(conv.id)}
              onRename={() => handleRename(conv.id)}
            />
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Top bar */}
        <div
          className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <Link href="/chat" className="md:hidden p-1" style={{ color: "var(--text-muted)" }}>
            <ArrowLeft size={18} />
          </Link>
          <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
            {isLoading ? "Loading…" : conversation?.title ?? "Conversation"}
          </p>
        </div>

        {/* Messages */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-6 relative"
        >
          {isLoading ? (
            <div className="flex flex-col gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={`flex gap-3 ${i % 2 === 0 ? "flex-row-reverse" : ""}`}>
                  <Skeleton className="w-7 h-7 rounded-full" />
                  <div className="flex flex-col gap-2 max-w-md">
                    <Skeleton style={{ height: "14px", width: i % 2 === 0 ? "180px" : "280px" }} />
                    <Skeleton style={{ height: "14px", width: "220px" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
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
