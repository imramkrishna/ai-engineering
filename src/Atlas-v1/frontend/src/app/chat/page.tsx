"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import type { Conversation } from "@/types";
import { EmptyState, Button, Skeleton } from "@/components/ui";
import { ConversationItem } from "@/components/chat";
import { conversationsApi } from "@/lib/api/client";

export default function ChatIndexPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadConversations = async () => {
      try {
        setIsLoading(true);
        const data = await conversationsApi.list();
        setConversations(data);
      } catch (error) {
        console.error("Failed to load conversations:", error);
        toast.error(error instanceof Error ? error.message : "Failed to load conversations");
      } finally {
        setIsLoading(false);
      }
    };

    loadConversations();
  }, []);

  const handleNew = async () => {
    router.push(`/chat/new`);
  };

  const handleDelete = async (id: string) => {
    try {
      const updated = conversations.filter((c) => c.id !== id);
      setConversations(updated);
      // Note: Backend doesn't have a delete endpoint yet, so we only update local state
      // In a real implementation, we would call a delete API endpoint
    } catch (error) {
      console.error("Failed to delete conversation:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete conversation");
    }
  };

  const handleRename = async (id: string) => {
    const title = prompt("New conversation name:");
    if (!title) return;
    try {
      const updated = conversations.map((c) =>
        c.id === id ? { ...c, title, updatedAt: new Date().toISOString() } : c
      );
      setConversations(updated);
      // Note: Backend doesn't have a rename endpoint yet, so we only update local state
      // In a real implementation, we would call a rename API endpoint
    } catch (error) {
      console.error("Failed to rename conversation:", error);
      toast.error(error instanceof Error ? error.message : "Failed to rename conversation");
    }
  };

  return (
    <div className="h-full flex">
      {/* Conversation list panel */}
      <div
        className="w-72 flex-shrink-0 flex flex-col border-r h-full"
        style={{ borderColor: "var(--border-subtle)", background: "var(--bg-sidebar)" }}
      >
        <div className="p-3 flex-shrink-0" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <button
            onClick={handleNew}
            className="atlas-btn atlas-btn-secondary w-full justify-center text-xs"
          >
            <Plus size={14} /> New conversation
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-3 py-2">
                <Skeleton style={{ height: "13px", width: "80%" }} />
                <div className="mt-1.5"><Skeleton style={{ height: "11px", width: "50%" }} /></div>
              </div>
            ))
          ) : conversations.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ color: "var(--text-muted)" }}>
              No conversations yet
            </p>
          ) : (
            conversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={false}
                onSelect={() => router.push(`/chat/${conv.id}`)}
                onDelete={() => handleDelete(conv.id)}
                onRename={() => handleRename(conv.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Empty state */}
      <div className="flex-1 flex items-center justify-center">
        <EmptyState
          icon={<MessageSquare size={20} />}
          title="Ask a question about your documents"
          description="Start a new conversation or select one from the list to continue."
          action={
            <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={handleNew}>
              New conversation
            </Button>
          }
        />
      </div>
    </div>
  );
}
