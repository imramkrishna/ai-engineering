"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, MessageSquare, Search } from "lucide-react";
import { toast } from "sonner";
import type { Conversation } from "@/types";
import { EmptyState, Button, Skeleton, Input } from "@/components/ui";
import { ConversationItem } from "@/components/chat";
import { conversationsApi } from "@/lib/api/client";
import { formatRelativeDate } from "@/lib/utils";

export default function ChatIndexPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const loadConversations = async () => {
      try {
        setIsLoading(true);
        const data = await conversationsApi.list();
        setConversations(data);
      } catch (error) {
        console.error("Failed to load conversations:", error);
        toast.error("Failed to load conversations");
      } finally {
        setIsLoading(false);
      }
    };
    loadConversations();
  }, []);

  const handleNew = () => router.push("/chat/new");

  const handleDelete = async (id: string) => {
    try {
      await conversationsApi.delete(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      toast.success("Conversation deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    }
  };

  const handleRename = async (id: string) => {
    const title = prompt("Rename conversation:");
    if (!title?.trim()) return;
    try {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, title: title.trim(), updatedAt: new Date().toISOString() } : c
        )
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to rename");
    }
  };

  const filtered = conversations.filter(
    (c) => !search || c.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex">
      {/* ── Conversation list panel ── */}
      <div
        className="w-[260px] flex-shrink-0 flex flex-col border-r h-full"
        style={{ borderColor: "var(--border-subtle)", background: "var(--bg-sidebar)" }}
      >
        {/* Header */}
        <div
          className="px-3 pt-4 pb-3 flex-shrink-0 flex flex-col gap-2.5"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div className="flex items-center justify-between">
            <h2
              className="text-[13px] font-semibold"
              style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}
            >
              Conversations
            </h2>
            <button
              onClick={handleNew}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-hover)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-muted)";
              }}
              aria-label="New conversation"
              title="New conversation"
            >
              <Plus size={16} strokeWidth={2} />
            </button>
          </div>
          {conversations.length > 4 && (
            <Input
              placeholder="Search conversations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftElement={<Search size={13} />}
              className="!py-[7px] !text-xs"
            />
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-2.5 py-2.5">
                <Skeleton style={{ height: "12px", width: "75%" }} />
                <div className="mt-1.5">
                  <Skeleton style={{ height: "10px", width: "40%" }} />
                </div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <p
              className="text-[12.5px] text-center py-10 px-4"
              style={{ color: "var(--text-muted)" }}
            >
              {search ? `No results for "${search}"` : "No conversations yet"}
            </p>
          ) : (
            filtered.map((conv) => (
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

        {/* Footer */}
        <div
          className="p-2.5 flex-shrink-0"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          <button
            onClick={handleNew}
            className="atlas-btn atlas-btn-primary w-full text-[12.5px] h-8"
            style={{ gap: 6 }}
          >
            <Plus size={14} strokeWidth={2.5} />
            New conversation
          </button>
        </div>
      </div>

      {/* ── Empty center state ── */}
      <div className="flex-1 flex items-center justify-center">
        <EmptyState
          icon={<MessageSquare size={18} />}
          title="Select a conversation"
          description="Pick one from the list, or start a new conversation to ask questions about your documents."
          action={
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus size={13} />}
              onClick={handleNew}
            >
              New conversation
            </Button>
          }
        />
      </div>
    </div>
  );
}
