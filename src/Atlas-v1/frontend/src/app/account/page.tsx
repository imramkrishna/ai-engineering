"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { User, Mail, Calendar, FileText, MessageSquare, ArrowRight, HardDrive } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { mockAccountApi } from "@/lib/mock";
import type { UsageStats } from "@/types";
import { PageHeader, Avatar, Button, Skeleton, Card } from "@/components/ui";
import { formatDate, formatBytes } from "@/lib/utils";

export default function AccountPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    mockAccountApi.getUsage().then((s) => { setStats(s); setIsLoading(false); });
  }, []);

  const statItems = stats ? [
    { icon: FileText, label: "Documents uploaded", value: stats.documentCount },
    { icon: MessageSquare, label: "Conversations", value: stats.conversationCount },
    { icon: MessageSquare, label: "Messages sent", value: stats.messageCount ?? 0 },
    { icon: HardDrive, label: "Storage used", value: formatBytes(stats.storageBytes ?? 0) },
  ] : [];

  return (
    <div className="p-6 flex flex-col gap-6 max-w-3xl mx-auto w-full animate-fade-in">
      <PageHeader title="Account" description="Manage your profile and usage" />

      {/* Profile card */}
      <div className="atlas-card p-6 flex flex-col gap-5">
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Profile</h2>

        <div className="flex items-center gap-4">
          {user ? (
            <Avatar name={user.name} size={56} />
          ) : (
            <Skeleton className="rounded-full" style={{ width: 56, height: 56 }} />
          )}
          <div className="flex flex-col gap-1">
            {user ? (
              <>
                <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{user.name}</p>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>{user.email}</p>
              </>
            ) : (
              <>
                <Skeleton style={{ height: "22px", width: "160px" }} />
                <Skeleton style={{ height: "14px", width: "200px" }} />
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-0">
          {[
            { icon: User, label: "Full name", value: user?.name },
            { icon: Mail, label: "Email address", value: user?.email },
            { icon: Calendar, label: "Member since", value: user?.createdAt ? formatDate(user.createdAt) : undefined },
          ].map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="flex items-center justify-between py-3"
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
              <div className="flex items-center gap-2">
                <Icon size={14} style={{ color: "var(--text-muted)" }} />
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{label}</span>
              </div>
              {value ? (
                <span className="text-sm" style={{ color: "var(--text-primary)" }}>{value}</span>
              ) : (
                <Skeleton style={{ height: "14px", width: "120px" }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Usage */}
      <div className="atlas-card p-6 flex flex-col gap-5">
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Usage</h2>
        <div className="grid grid-cols-2 gap-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-3 rounded-[var(--radius-md)]" style={{ background: "var(--bg-base)" }}>
                <Skeleton style={{ height: "11px", width: "80%" }} />
                <div className="mt-2"><Skeleton style={{ height: "22px", width: "50%" }} /></div>
              </div>
            ))
          ) : (
            statItems.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="p-3 rounded-[var(--radius-md)] flex flex-col gap-1"
                style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)" }}
              >
                <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                  <Icon size={12} />{label}
                </div>
                <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{value}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="atlas-card p-6 flex flex-col gap-3">
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Quick access</h2>
        {[
          { href: "/documents", label: "View all documents", icon: FileText },
          { href: "/chat", label: "Go to conversations", icon: MessageSquare },
          { href: "/settings", label: "Account settings", icon: User },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center justify-between py-3 px-1 rounded-[var(--radius-md)] transition-colors"
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "")}
          >
            <div className="flex items-center gap-2">
              <Icon size={15} style={{ color: "var(--accent-primary)" }} />
              <span className="text-sm" style={{ color: "var(--text-primary)" }}>{label}</span>
            </div>
            <ArrowRight size={14} style={{ color: "var(--text-muted)" }} />
          </Link>
        ))}
      </div>
    </div>
  );
}
