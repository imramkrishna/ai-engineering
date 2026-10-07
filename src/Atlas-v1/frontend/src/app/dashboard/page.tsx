"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  FileText,
  Plus,
  Upload,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { mockConversationsApi, mockDocumentsApi, mockAccountApi } from "@/lib/mock";
import type { Conversation, Document, UsageStats } from "@/types";
import { Card, Skeleton, Button, StatusBadge } from "@/components/ui";
import { formatRelativeDate, formatBytes, truncate } from "@/lib/utils";

// Can't import from documents component directly in this page without circular issues
// so re-export the StatusBadge from documents directly
import { StatusBadge as DocStatusBadge } from "@/components/documents";

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [convs, docs, usage] = await Promise.all([
          mockConversationsApi.list(),
          mockDocumentsApi.list(),
          mockAccountApi.getUsage(),
        ]);
        setConversations(convs.slice(0, 4));
        setDocuments(docs.data.slice(0, 4));
        setStats(usage);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const handleNewChat = async () => {
    const conv = await mockConversationsApi.create();
    router.push(`/chat/${conv.id}`);
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex flex-col gap-8 p-6 max-w-5xl mx-auto w-full animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
          {greeting}{user ? `, ${user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Your AI-powered RAG workspace
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={handleNewChat}
          className="flex items-start gap-4 p-5 rounded-[var(--radius-lg)] text-left transition-all"
          style={{ background: "var(--accent-primary)", color: "#000" }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.92")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <MessageSquare size={22} strokeWidth={2} />
          <div>
            <p className="font-semibold text-sm">New Chat</p>
            <p className="text-xs mt-0.5 opacity-75">Ask questions about your documents</p>
          </div>
        </button>
        <Link
          href="/documents"
          className="flex items-start gap-4 p-5 rounded-[var(--radius-lg)] text-left transition-all"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-strong)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
        >
          <Upload size={22} strokeWidth={2} style={{ color: "var(--accent-primary)" }} />
          <div>
            <p className="font-semibold text-sm">Upload Document</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              PDF, DOCX, TXT, Markdown
            </p>
          </div>
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="atlas-card p-4 flex flex-col gap-2">
              <Skeleton style={{ height: "12px", width: "60%" }} />
              <Skeleton style={{ height: "24px", width: "40%" }} />
            </div>
          ))
        ) : stats ? (
          [
            { label: "Documents", value: stats.documentCount, icon: FileText },
            { label: "Conversations", value: stats.conversationCount, icon: MessageSquare },
            { label: "Messages", value: stats.messageCount ?? 0, icon: TrendingUp },
            { label: "Storage", value: formatBytes(stats.storageBytes ?? 0), icon: CheckCircle2 },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="atlas-card p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{label}</span>
                <Icon size={14} style={{ color: "var(--text-muted)" }} />
              </div>
              <span className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{value}</span>
            </div>
          ))
        ) : null}
      </div>

      {/* Recent conversations + Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversations */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Recent conversations
            </h2>
            <Link href="/chat" className="flex items-center gap-1 text-xs" style={{ color: "var(--accent-primary)" }}>
              View all <ArrowRight size={12} />
            </Link>
          </div>

          <div className="flex flex-col gap-2">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="atlas-card p-3 flex flex-col gap-2">
                  <Skeleton style={{ height: "13px", width: "70%" }} />
                  <Skeleton style={{ height: "11px", width: "40%" }} />
                </div>
              ))
            ) : conversations.length === 0 ? (
              <div className="atlas-card p-6 flex flex-col items-center gap-3 text-center">
                <MessageSquare size={24} style={{ color: "var(--text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>No conversations yet</p>
                <Button variant="secondary" size="sm" leftIcon={<Plus size={13} />} onClick={handleNewChat}>
                  Start chatting
                </Button>
              </div>
            ) : (
              conversations.map((conv) => (
                <Link
                  key={conv.id}
                  href={`/chat/${conv.id}`}
                  className="atlas-card p-3 flex flex-col gap-1 cursor-pointer"
                >
                  <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
                    {conv.title}
                  </p>
                  <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                    <Clock size={10} />
                    <span>{formatRelativeDate(conv.updatedAt)}</span>
                    {conv.messageCount && <span>· {conv.messageCount} messages</span>}
                  </div>
                  {conv.lastMessage && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-secondary)" }}>
                      {truncate(conv.lastMessage, 60)}
                    </p>
                  )}
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Documents */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Recent documents
            </h2>
            <Link href="/documents" className="flex items-center gap-1 text-xs" style={{ color: "var(--accent-primary)" }}>
              View all <ArrowRight size={12} />
            </Link>
          </div>

          <div className="flex flex-col gap-2">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="atlas-card p-3 flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-lg" />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <Skeleton style={{ height: "13px", width: "60%" }} />
                    <Skeleton style={{ height: "11px", width: "35%" }} />
                  </div>
                </div>
              ))
            ) : documents.length === 0 ? (
              <div className="atlas-card p-6 flex flex-col items-center gap-3 text-center">
                <FileText size={24} style={{ color: "var(--text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>No documents yet</p>
                <Link href="/documents">
                  <Button variant="secondary" size="sm" leftIcon={<Upload size={13} />}>
                    Upload first document
                  </Button>
                </Link>
              </div>
            ) : (
              documents.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/documents/${doc.id}`}
                  className="atlas-card p-3 flex items-center gap-3 cursor-pointer"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: "var(--accent-primary-muted)", color: "var(--accent-primary)" }}
                  >
                    {doc.fileType}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
                      {doc.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <DocStatusBadge status={doc.status} />
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {formatRelativeDate(doc.uploadedAt)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
