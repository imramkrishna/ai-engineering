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
  HardDrive,
  Sparkles,
  Layers,
} from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { conversationsApi, documentsApi, accountApi } from "@/lib/api/client";
import type { Conversation, Document, UsageStats } from "@/types";
import { Skeleton, Button } from "@/components/ui";
import { formatRelativeDate, formatBytes, truncate, getFileExtension } from "@/lib/utils";
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
          conversationsApi.list().catch(() => []),
          documentsApi.getAll().catch(() => []),
          accountApi.getUsage().catch(() => null),
        ]);
        setConversations(convs.slice(0, 4));
        setDocuments(docs.slice(0, 4));
        setStats(
          usage ?? {
            documentCount: docs.length,
            conversationCount: convs.length,
            messageCount: 0,
            storageBytes: docs.reduce((acc, d) => acc + (d.fileSizeBytes || 0), 0),
          }
        );
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const handleNewChat = () => {
    router.push("/chat/new");
  };

  const [greeting, setGreeting] = useState("Welcome back");

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");
  }, []);

  const firstName = user?.name.split(" ")[0] ?? "";

  const totalChunks = documents.reduce((acc, d) => acc + (d.chunkCount || 0), 0);

  const statItems = stats
    ? [
        { label: "Documents", value: stats.documentCount, icon: FileText, color: "var(--accent-primary)" },
        { label: "Conversations", value: stats.conversationCount, icon: MessageSquare, color: "#818cf8" },
        {
          label: stats.messageCount ? "Messages" : "Indexed Chunks",
          value: stats.messageCount ? stats.messageCount : totalChunks,
          icon: stats.messageCount ? TrendingUp : Layers,
          color: "#34d399",
        },
        { label: "Storage", value: formatBytes(stats.storageBytes ?? 0), icon: HardDrive, color: "#fb923c" },
      ]
    : [];

  return (
    <div className="flex flex-col gap-8 p-6 max-w-5xl mx-auto w-full animate-fade-in-up">

      {/* ── Greeting ── */}
      <div className="flex flex-col gap-1 pt-2">
        <h1
          className="text-[26px] font-semibold tracking-tight"
          style={{ color: "var(--text-primary)", letterSpacing: "-0.04em", lineHeight: 1.15 }}
        >
          {greeting}{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="text-[13.5px]" style={{ color: "var(--text-muted)", letterSpacing: "-0.01em" }}>
          Your AI workspace is ready. What would you like to explore?
        </p>
      </div>

      {/* ── Quick actions ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={handleNewChat}
          className="flex items-center gap-4 p-5 rounded-2xl text-left transition-all group"
          style={{
            background: "linear-gradient(135deg, var(--accent-primary) 0%, #17a49c 100%)",
            color: "#021a19",
            boxShadow: "0 4px 20px var(--accent-primary-glow), inset 0 1px 0 rgba(255,255,255,0.15)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "0 8px 28px var(--accent-primary-glow), inset 0 1px 0 rgba(255,255,255,0.15)";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "0 4px 20px var(--accent-primary-glow), inset 0 1px 0 rgba(255,255,255,0.15)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(2,26,25,0.15)" }}
          >
            <Sparkles size={19} strokeWidth={2} />
          </div>
          <div>
            <p className="font-semibold text-[14px]" style={{ letterSpacing: "-0.02em" }}>New chat</p>
            <p className="text-[12.5px] mt-0.5" style={{ opacity: 0.7 }}>
              Ask questions about your documents
            </p>
          </div>
          <ArrowRight
            size={16}
            className="ml-auto flex-shrink-0 transition-transform group-hover:translate-x-0.5"
          />
        </button>

        <Link
          href="/documents"
          className="flex items-center gap-4 p-5 rounded-2xl text-left transition-all group"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-primary)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--border-default)";
            e.currentTarget.style.background = "var(--bg-elevated)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border-subtle)";
            e.currentTarget.style.background = "var(--bg-card)";
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--accent-primary-muted)", color: "var(--accent-primary)" }}
          >
            <Upload size={18} strokeWidth={2} />
          </div>
          <div>
            <p className="font-semibold text-[14px]" style={{ letterSpacing: "-0.02em" }}>
              Upload document
            </p>
            <p className="text-[12.5px] mt-0.5" style={{ color: "var(--text-muted)" }}>
              PDF, DOCX, TXT, Markdown
            </p>
          </div>
          <ArrowRight
            size={16}
            className="ml-auto flex-shrink-0 transition-transform group-hover:translate-x-0.5"
            style={{ color: "var(--text-muted)" }}
          />
        </Link>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="atlas-card p-4 flex flex-col gap-3">
                <Skeleton style={{ height: "11px", width: "55%" }} />
                <Skeleton style={{ height: "28px", width: "45%" }} />
              </div>
            ))
          : statItems.map(({ label, value, icon: Icon, color }) => (
              <div
                key={label}
                className="atlas-card p-4 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-[11.5px] font-medium"
                    style={{ color: "var(--text-muted)", letterSpacing: "0.01em" }}
                  >
                    {label}
                  </span>
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center"
                    style={{ background: `${color}15`, color }}
                  >
                    <Icon size={12} />
                  </div>
                </div>
                <span
                  className="text-[22px] font-bold"
                  style={{ color: "var(--text-primary)", letterSpacing: "-0.04em", lineHeight: 1 }}
                >
                  {value}
                </span>
              </div>
            ))}
      </div>

      {/* ── Recent activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Conversations */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2
              className="text-[13px] font-semibold"
              style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}
            >
              Recent conversations
            </h2>
            <Link
              href="/chat"
              className="flex items-center gap-1 text-[12.5px] transition-colors"
              style={{ color: "var(--accent-primary)" }}
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>

          <div className="flex flex-col gap-2">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="atlas-card p-3.5 flex flex-col gap-2">
                  <Skeleton style={{ height: "13px", width: "65%" }} />
                  <Skeleton style={{ height: "11px", width: "35%" }} />
                </div>
              ))
            ) : conversations.length === 0 ? (
              <div className="atlas-card p-8 flex flex-col items-center gap-3 text-center">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}
                >
                  <MessageSquare size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    No conversations yet
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    Start a chat to ask about your documents
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Plus size={13} />}
                  onClick={handleNewChat}
                >
                  Start chatting
                </Button>
              </div>
            ) : (
              conversations.map((conv) => (
                <Link
                  key={conv.id}
                  href={`/chat/${conv.id}`}
                  className="atlas-card p-3.5 flex flex-col gap-1.5 hoverable transition-colors"
                >
                  <p
                    className="text-[13px] font-medium truncate"
                    style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}
                  >
                    {conv.title}
                  </p>
                  <div
                    className="flex items-center gap-1.5 text-[11.5px]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <Clock size={10} />
                    <span>{formatRelativeDate(conv.updatedAt)}</span>
                    {conv.messageCount && (
                      <span className="opacity-60">· {conv.messageCount} messages</span>
                    )}
                  </div>
                  {conv.lastMessage && (
                    <p
                      className="text-[12px] truncate"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {truncate(conv.lastMessage, 65)}
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
            <h2
              className="text-[13px] font-semibold"
              style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}
            >
              Recent documents
            </h2>
            <Link
              href="/documents"
              className="flex items-center gap-1 text-[12.5px] transition-colors"
              style={{ color: "var(--accent-primary)" }}
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>

          <div className="flex flex-col gap-2">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="atlas-card p-3.5 flex items-center gap-3">
                  <Skeleton className="w-9 h-9 rounded-lg" />
                  <div className="flex-1 flex flex-col gap-2">
                    <Skeleton style={{ height: "13px", width: "60%" }} />
                    <Skeleton style={{ height: "11px", width: "35%" }} />
                  </div>
                </div>
              ))
            ) : documents.length === 0 ? (
              <div className="atlas-card p-8 flex flex-col items-center gap-3 text-center">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}
                >
                  <FileText size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    No documents yet
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    Upload a file to get started
                  </p>
                </div>
                <Link href="/documents">
                  <Button variant="secondary" size="sm" leftIcon={<Upload size={13} />}>
                    Upload document
                  </Button>
                </Link>
              </div>
            ) : (
              documents.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/documents/${doc.id}`}
                  className="atlas-card p-3.5 flex items-center gap-3 hoverable"
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0 uppercase tracking-wide overflow-hidden"
                    style={{
                      background: "var(--accent-primary-muted)",
                      color: "var(--accent-primary)",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {getFileExtension(doc.filename || doc.fileType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[13px] font-medium truncate"
                      style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}
                    >
                      {doc.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <DocStatusBadge status={doc.status} />
                      <span className="text-[11.5px]" style={{ color: "var(--text-muted)" }}>
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
