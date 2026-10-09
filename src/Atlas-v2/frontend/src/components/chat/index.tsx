"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  RefreshCcw,
  Copy,
  Check,
  ChevronDown,
  BookOpen,
  Bug,
  X,
  Paperclip,
} from "lucide-react";
import { cn, formatRelativeDate } from "@/lib/utils";
import type { Message, Citation, DebugInfo } from "@/types";
import { Spinner, Button, EmptyState, Skeleton } from "@/components/ui";

// ─── Typing Indicator ─────────────────────────────────────────
export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      <div className="flex gap-1">
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
    </div>
  );
}

// ─── Copy Button ──────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="atlas-btn atlas-btn-ghost px-2 py-1 text-xs gap-1"
      aria-label="Copy message"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ─── Citation Marker (inline) ─────────────────────────────────
function CitationMarker({ num, onClick }: { num: number; onClick: () => void }) {
  return (
    <button className="citation-marker" onClick={onClick} aria-label={`View source ${num}`}>
      {num}
    </button>
  );
}

// ─── Render text with citation markers ────────────────────────
function RenderContent({
  content,
  citations,
  onCitationClick,
}: {
  content: string;
  citations?: Citation[];
  onCitationClick?: (c: Citation) => void;
}) {
  if (!citations?.length) {
    return (
      <div className="prose-atlas" dangerouslySetInnerHTML={{ __html: simpleMarkdown(content) }} />
    );
  }

  // Replace [N] with interactive citation markers
  const parts = content.split(/(\[\d+\])/g);
  return (
    <div className="prose-atlas leading-relaxed">
      {parts.map((part, i) => {
        const match = part.match(/^\[(\d+)\]$/);
        if (match) {
          const num = parseInt(match[1]);
          const citation = citations.find((c) => c.sourceId === num);
          return (
            <CitationMarker
              key={i}
              num={num}
              onClick={() => citation && onCitationClick?.(citation)}
            />
          );
        }
        return (
          <span key={i} dangerouslySetInnerHTML={{ __html: simpleMarkdown(part) }} />
        );
      })}
    </div>
  );
}

// Minimal markdown renderer (bold, italic, code, code blocks, newlines)
function simpleMarkdown(text: string): string {
  return text
    .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
      `<pre><code class="language-${lang}">${escapeHtml(code.trim())}</code></pre>`
    )
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>");
}

function escapeHtml(str: string) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ─── Source Card ──────────────────────────────────────────────
export function SourceCard({ citation, onClose }: { citation: Citation; onClose: () => void }) {
  return (
    <div
      className="animate-fade-in rounded-[var(--radius-lg)] p-4 flex flex-col gap-2"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: "var(--accent-primary-muted)", color: "var(--accent-primary)" }}
          >
            {citation.sourceId}
          </span>
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{citation.title}</p>
            {citation.page && (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Page {citation.page}</p>
            )}
          </div>
        </div>
        <button onClick={onClose} style={{ color: "var(--text-muted)" }}>
          <X size={14} />
        </button>
      </div>
      <blockquote
        className="text-xs leading-relaxed border-l-2 pl-3 italic"
        style={{ borderColor: "var(--accent-primary)", color: "var(--text-secondary)" }}
      >
        "{citation.quote}"
      </blockquote>
      {citation.score && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Relevance: {(citation.score * 100).toFixed(0)}%
        </p>
      )}
    </div>
  );
}

// ─── Citation List ────────────────────────────────────────────
export function CitationList({ citations }: { citations: Citation[] }) {
  return (
    <div className="flex flex-col gap-2 mt-3">
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        Sources
      </p>
      <div className="flex flex-col gap-2">
        {citations.map((c) => (
          <div
            key={c.sourceId}
            className="flex items-start gap-3 p-3 rounded-[var(--radius-md)]"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
          >
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
              style={{ background: "var(--accent-primary-muted)", color: "var(--accent-primary)" }}
            >
              {c.sourceId}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{c.title}</p>
              {c.page && <p className="text-xs" style={{ color: "var(--text-muted)" }}>Page {c.page}</p>}
              <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--text-secondary)" }}>"{c.quote}"</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Debug Panel ──────────────────────────────────────────────
function DebugPanel({ debug }: { debug: DebugInfo }) {
  return (
    <div
      className="mt-3 p-3 rounded-[var(--radius-md)] text-xs font-mono"
      style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
    >
      <p className="font-semibold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-sans)" }}>Debug info</p>
      <div className="grid grid-cols-2 gap-1">
        {debug.retrievedChunks && <><span style={{ color: "var(--text-muted)" }}>Retrieved chunks</span><span>{debug.retrievedChunks}</span></>}
        {debug.topScore && <><span style={{ color: "var(--text-muted)" }}>Top score</span><span>{(debug.topScore * 100).toFixed(0)}%</span></>}
        {debug.model && <><span style={{ color: "var(--text-muted)" }}>Model</span><span>{debug.model}</span></>}
        {debug.latencyMs && <><span style={{ color: "var(--text-muted)" }}>Latency</span><span>{debug.latencyMs}ms</span></>}
        {debug.embeddingModel && <><span style={{ color: "var(--text-muted)" }}>Embeddings</span><span>{debug.embeddingModel}</span></>}
        {debug.retrievalMode && <><span style={{ color: "var(--text-muted)" }}>Mode</span><span>{debug.retrievalMode}</span></>}
      </div>
    </div>
  );
}

// ─── Chat Message ─────────────────────────────────────────────
export function ChatMessage({
  message,
  onRegenerate,
}: {
  message: Message;
  onRegenerate?: () => void;
}) {
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const isUser = message.role === "user";
  const citations = message.ragAnswer?.citations ?? [];
  const debug = message.ragAnswer?.debugInfo;

  return (
    <div className={cn("flex gap-3 group animate-fade-in", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
        style={{
          background: isUser ? "var(--bg-card)" : "var(--accent-primary)",
          border: "1px solid var(--border-subtle)",
          color: isUser ? "var(--text-secondary)" : "#000",
        }}
      >
        {isUser ? "U" : "A"}
      </div>

      {/* Bubble */}
      <div className={cn("flex flex-col gap-2 max-w-2xl", isUser && "items-end")}>
        {isUser ? (
          <div
            className="px-4 py-3 rounded-[var(--radius-lg)] text-sm"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
          >
            {message.content}
          </div>
        ) : (
          <div>
            {message.isStreaming ? (
              <div className="flex items-center gap-2 py-2">
                <TypingIndicator />
              </div>
            ) : (
              <div className="text-sm" style={{ color: "var(--text-primary)" }}>
                <RenderContent
                  content={message.content}
                  citations={citations}
                  onCitationClick={setActiveCitation}
                />
                {citations.length > 0 && <CitationList citations={citations} />}
                {activeCitation && (
                  <SourceCard citation={activeCitation} onClose={() => setActiveCitation(null)} />
                )}
                {debug && showDebug && <DebugPanel debug={debug} />}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {!isUser && !message.isStreaming && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <CopyButton text={message.content} />
            {onRegenerate && (
              <button onClick={onRegenerate} className="atlas-btn atlas-btn-ghost px-2 py-1 text-xs gap-1">
                <RefreshCcw size={12} /> Retry
              </button>
            )}
            {debug && (
              <button
                onClick={() => setShowDebug((v) => !v)}
                className="atlas-btn atlas-btn-ghost px-2 py-1 text-xs gap-1"
              >
                <Bug size={12} /> Debug
              </button>
            )}
            <span className="text-xs ml-1" style={{ color: "var(--text-muted)" }}>
              {formatRelativeDate(message.createdAt)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Chat Input ───────────────────────────────────────────────
interface ChatInputProps {
  onSend: (content: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function ChatInput({ onSend, isLoading, placeholder = "Ask a question about your documents…", disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 180) + "px";
  };

  const submit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isLoading || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, [value, isLoading, disabled, onSend]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div
      className="px-4 py-3 flex-shrink-0"
      style={{ borderTop: "1px solid var(--border-subtle)", background: "var(--bg-base)" }}
    >
      <div
        className="flex items-end gap-2 rounded-[var(--radius-lg)] px-4 py-3"
        style={{ background: "var(--bg-input)", border: "1px solid var(--border-default)" }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => { setValue(e.target.value); adjustHeight(); }}
          onKeyDown={handleKey}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          rows={1}
          className="flex-1 resize-none bg-transparent outline-none text-sm leading-relaxed"
          style={{ color: "var(--text-primary)", minHeight: "24px", maxHeight: "180px" }}
          aria-label="Chat input"
        />
        <button
          onClick={submit}
          disabled={!value.trim() || isLoading || disabled}
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
          style={{
            background: value.trim() && !isLoading ? "var(--accent-primary)" : "var(--bg-hover)",
            color: value.trim() && !isLoading ? "#000" : "var(--text-muted)",
          }}
          aria-label="Send message"
        >
          {isLoading ? <Spinner size={14} /> : <Send size={14} />}
        </button>
      </div>
      <p className="text-xs mt-2 text-center" style={{ color: "var(--text-muted)" }}>
        Enter to send · Shift+Enter for newline
      </p>
    </div>
  );
}

// ─── Scroll-to-Bottom Button ───────────────────────────────────
export function ScrollToBottom({ onClick, visible }: { onClick: () => void; visible: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "absolute bottom-24 right-6 w-8 h-8 rounded-full flex items-center justify-center transition-all",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
      )}
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", color: "var(--text-secondary)" }}
    >
      <ChevronDown size={16} />
    </button>
  );
}

// ─── Conversation List Item ────────────────────────────────────
export function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
  onRename,
}: {
  conversation: { id: string; title: string; updatedAt: string };
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className={cn(
        "group flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] cursor-pointer relative",
        "transition-all",
        isActive ? "active" : ""
      )}
      style={{
        background: isActive ? "var(--bg-active)" : "transparent",
        color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
      }}
      onClick={onSelect}
    >
      <span className="flex-1 min-w-0 text-xs truncate">{conversation.title}</span>
      <span className="text-xs flex-shrink-0 opacity-60">{formatRelativeDate(conversation.updatedAt)}</span>

      {/* Context menu */}
      <div className="relative">
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity"
          style={{ color: "var(--text-muted)" }}
          aria-label="Conversation options"
        >
          ···
        </button>
        {menuOpen && (
          <div
            className="absolute right-0 top-6 w-36 rounded-[var(--radius-md)] py-1 z-50"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", boxShadow: "var(--shadow-md)" }}
          >
            <button
              className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--bg-hover)] transition-colors"
              style={{ color: "var(--text-secondary)" }}
              onClick={(e) => { e.stopPropagation(); onRename(); setMenuOpen(false); }}
            >
              Rename
            </button>
            <button
              className="w-full text-left px-3 py-2 text-xs transition-colors"
              style={{ color: "var(--status-error)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "")}
              onClick={(e) => { e.stopPropagation(); onDelete(); setMenuOpen(false); }}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
