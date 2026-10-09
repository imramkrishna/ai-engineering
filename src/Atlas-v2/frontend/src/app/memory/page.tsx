"use client";

import React, { useState, useEffect } from "react";
import { Brain, Trash2, Plus, Search, AlertTriangle } from "lucide-react";
import { mockMemoryApi } from "@/lib/mock";
import type { MemoryItem, MemorySettings } from "@/types";
import { PageHeader, Button, Input, EmptyState, ErrorState, Toggle, Skeleton, Card } from "@/components/ui";
import { formatRelativeDate } from "@/lib/utils";

export default function MemoryPage() {
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [settings, setSettings] = useState<MemorySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [newContent, setNewContent] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [memItems, memSettings] = await Promise.all([
        mockMemoryApi.list(),
        mockMemoryApi.getSettings(),
      ]);
      setItems(memItems);
      setSettings(memSettings);
      setIsLoading(false);
    };
    load();
  }, []);

  const handleToggleMemory = async (enabled: boolean) => {
    const updated = await mockMemoryApi.updateSettings({ enabled });
    setSettings(updated);
  };

  const handleAdd = async () => {
    if (!newContent.trim()) return;
    setIsAdding(true);
    const item = await mockMemoryApi.create(newContent.trim());
    setItems((prev) => [item, ...prev]);
    setNewContent("");
    setShowAdd(false);
    setIsAdding(false);
  };

  const handleDelete = async (id: string) => {
    await mockMemoryApi.delete(id);
    setItems((prev) => prev.filter((m) => m.id !== id));
  };

  const handleClear = async () => {
    await mockMemoryApi.clear();
    setItems([]);
    setConfirmClear(false);
  };

  const filtered = items.filter((m) =>
    !search || m.content.toLowerCase().includes(search.toLowerCase())
  );

  const categoryColors: Record<string, string> = {
    context: "rgba(32,178,170,0.12)",
    preferences: "rgba(59,130,246,0.12)",
    default: "rgba(160,160,160,0.08)",
  };

  return (
    <div className="p-6 flex flex-col gap-6 max-w-3xl mx-auto w-full animate-fade-in">
      <PageHeader
        title="Memory"
        description="Atlas can remember context about you and your projects across conversations"
        action={
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Plus size={14} />}
            onClick={() => setShowAdd((v) => !v)}
          >
            Add memory
          </Button>
        }
      />

      {/* Settings */}
      <div className="atlas-card p-5 flex flex-col gap-4">
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Memory settings</h2>
        {settings && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: "var(--text-primary)" }}>Enable memory</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                When enabled, Atlas learns from your conversations to personalize future responses
              </p>
            </div>
            <Toggle
              checked={settings.enabled}
              onChange={handleToggleMemory}
            />
          </div>
        )}
        {!settings && <Skeleton style={{ height: "40px" }} />}
      </div>

      {/* Add memory */}
      {showAdd && (
        <div className="atlas-card p-4 flex flex-col gap-3 animate-fade-in">
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Add new memory</p>
          <textarea
            className="atlas-input resize-none"
            placeholder="e.g. User is building a RAG system with TypeScript and PostgreSQL…"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={3}
            aria-label="Memory content"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button variant="primary" size="sm" isLoading={isAdding} onClick={handleAdd}>Save</Button>
          </div>
        </div>
      )}

      {/* Memories */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Saved memories ({items.length})
          </h2>
          {items.length > 0 && (
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Trash2 size={13} />}
              onClick={() => setConfirmClear(true)}
            >
              Clear all
            </Button>
          )}
        </div>

        {/* Search */}
        {items.length > 3 && (
          <Input
            placeholder="Search memories…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftElement={<Search size={14} />}
          />
        )}

        {/* Confirm clear dialog */}
        {confirmClear && (
          <div
            className="p-4 rounded-[var(--radius-md)] flex flex-col gap-3 animate-fade-in"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} style={{ color: "var(--status-error)", flexShrink: 0, marginTop: 2 }} />
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--status-error)" }}>Clear all memories?</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  This will permanently delete all {items.length} saved memories. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmClear(false)}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={handleClear}>Delete all</Button>
            </div>
          </div>
        )}

        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="atlas-card p-4 flex flex-col gap-2">
              <Skeleton style={{ height: "13px", width: "80%" }} />
              <Skeleton style={{ height: "11px", width: "50%" }} />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Brain size={20} />}
            title={search ? "No memories match" : "No memories saved"}
            description={
              search
                ? `No memories match "${search}"`
                : "Atlas will automatically save useful context as you chat. You can also add memories manually."
            }
          />
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="atlas-card p-4 flex items-start gap-3"
              style={{ transition: "all var(--transition-fast)" }}
            >
              {item.category && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                  style={{
                    background: categoryColors[item.category] ?? categoryColors.default,
                    color: "var(--text-secondary)",
                  }}
                >
                  {item.category}
                </span>
              )}
              <p className="flex-1 text-sm" style={{ color: "var(--text-primary)" }}>{item.content}</p>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {formatRelativeDate(item.createdAt)}
                </span>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1 rounded transition-colors"
                  style={{ color: "var(--text-muted)" }}
                  aria-label="Delete memory"
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--status-error)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Info box */}
      <div
        className="p-4 rounded-[var(--radius-md)] text-xs"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}
      >
        <p className="font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>How memory works</p>
        <p>
          When memory is enabled, Atlas extracts relevant context from your conversations — preferences, background, 
          ongoing projects — and injects it into future prompts. This makes responses more personalized without 
          requiring you to repeat context every time.
        </p>
      </div>
    </div>
  );
}
