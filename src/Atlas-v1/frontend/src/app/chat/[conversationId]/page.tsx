"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Plus, ArrowLeft } from "lucide-react";
import { conversationsApi } from "@/lib/api/client";
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
      try {
        // Load conversation details
        const conv = await conversationsApi.get(conversationId);
        setConversation(conv);

        // Load messages for this conversation
        const msgs = await conversationsApi.getMessages(conversationId);
        setMessages(msgs);

        // For sidebar, we'll load from localStorage since backend doesn't expose list
        const stored = localStorage.getItem("atlas-conversations");
        const convs = stored ? JSON.parse(stored) : [];
        setConversations(convs);
      } catch (error) {
        console.error("Failed to load conversation:", error);
        // Set empty state on error
        setConversation(null);
        setMessages([]);
        setConversations([]);
      } finally {
        setIsLoading(false);
      }
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
      const response = await conversationsApi.sendMessage(conversationId, { content });
      setMessages((m) => {
        const without = m.filter((x) => !x.isStreaming);
        return [...without, response.message];
      });

      // Store messages in localStorage for persistence
      const updatedMessages = [...messages, optimisticUser, response.message];
      localStorage.setItem(`atlas-messages-${conversationId}`, JSON.stringify(updatedMessages));

      // Update conversation title if it's the first message
      if (messages.length === 0 && conversation) {
        const title = content.length > 50 ? content.substring(0, 50) + "..." : content;
        setConversation((prev) => (prev ? { ...prev, title } : prev));

        // Update in conversations list
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId ? { ...c, title, updatedAt: new Date().toISOString() } : c
          )
        );

        // Save to localStorage
        const stored = localStorage.getItem("atlas-conversations");
        const convs = stored ? JSON.parse(stored) : [];
        const updatedConvs = convs.map((c: Conversation) =>
          c.id === conversationId ? { ...c, title, updatedAt: new Date().toISOString() } : c
        );
        localStorage.setItem("atlas-conversations", JSON.stringify(updatedConvs));
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages((m) => m.filter((x) => !x.isStreaming));
    } finally {
      setIsSending(false);
    }
  };

  const handleNew = async () => {
    // Create new conversation via API
    try {
      const response = await conversationsApi.newChat({ content: "New conversation" });
      // Response shape: { success: boolean; data: { conversationId: string; message: string; sources: ... } }
      const conversationId = response.data?.conversationId;
      if (!conversationId) {
        throw new Error("No conversation ID returned from backend");
      }
      const newConversation: Conversation = {
        id: conversationId,
        title: "New conversation",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: "user-1", // Should come from auth
      };

      // Add to local storage
      const stored = localStorage.getItem("atlas-conversations");
      const convs = stored ? JSON.parse(stored) : [];
      const updated = [...convs, newConversation];
      localStorage.setItem("atlas-conversations", JSON.stringify(updated));
      setConversations(updated);

      router.push(`/chat/${conversationId}`);
    } catch (error) {
      console.error("Failed to create new conversation:", error);
    }
  };

  const handleDelete = async (id: string) => {
    // Note: Backend doesn't expose delete endpoint, so we only remove from localStorage
    const updated = conversations.filter((c) => c.id !== id);
    setConversations(updated);
    localStorage.setItem("atlas-conversations", JSON.stringify(updated));
    
    if (id === conversationId) {
      router.push("/chat");
    }
  };

  const handleRename = async (id: string) => {
    const title = prompt("New conversation name:");
    if (!title) return;

    // Update in conversations list
    const updated = conversations.map((c) =>
      c.id === id ? { ...c, title, updatedAt: new Date().toISOString() } : c
    );
    setConversations(updated);
    localStorage.setItem("atlas-conversations", JSON.stringify(updated));

    if (id === conversationId) {
      setConversation((prev) => (prev ? { ...prev, title } : prev));
    }
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
            {isLoading ? "Loading..." : conversation?.title ?? "Conversation"}
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
