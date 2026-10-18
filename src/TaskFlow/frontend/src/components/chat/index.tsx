"use client";

import React, { useState, useRef, useCallback } from "react";
import {
  Send,
  RefreshCcw,
  Copy,
  Check,
  ChevronDown,
  Bug,
  X,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn, formatRelativeDate } from "@/lib/utils";
import type { Message, Citation, DebugInfo } from "@/types";
import { Spinner } from "@/components/ui";

// ─── Typing Indicator ─────────────────────────────────────────
export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1">
      <div className="flex gap-[5px] items-center">
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
      className="atlas-btn atlas-btn-ghost py-1 px-2 text-xs gap-1.5 h-7"
      aria-label="Copy message"
    >
      {copied ? <Check size={12} strokeWidth={2.5} /> : <Copy size={12} />}
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

// ─── Citation Marker (inline) ─────────────────────────────────
function CitationMarker({ num, onClick }: { num: number; onClick: () => void }) {
  return (
    <button
      className="citation-marker"
      onClick={onClick}
      aria-label={`View source ${num}`}
    >
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
      <div
        className="prose text-[15px] leading-[1.75]"
        style={{ color: "var(--text-primary)" }}
        dangerouslySetInnerHTML={{ __html: simpleMarkdown(content) }}
      />
    );
  }

  const parts = content.split(/(\[\d+\])/g);
  return (
    <div
      className="prose text-[15px] leading-[1.75]"
      style={{ color: "var(--text-primary)" }}
    >
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
      className="animate-scale-in mt-3 rounded-xl p-4 flex flex-col gap-3"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-default)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: "var(--accent-primary-muted)", color: "var(--accent-primary)" }}
          >
            {citation.sourceId}
          </span>
          <div>
            <p className="text-[13px] font-medium" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
              {citation.title}
            </p>
            {citation.page && (
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                Page {citation.page}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md transition-colors flex-shrink-0"
          style={{ color: "var(--text-muted)" }}
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </div>
      <blockquote
        className="text-[12.5px] leading-relaxed border-l-2 pl-3"
        style={{ borderColor: "var(--accent-primary)", color: "var(--text-secondary)", fontStyle: "italic" }}
      >
        &ldquo;{citation.quote}&rdquo;
      </blockquote>
      {citation.score && (
        <div className="flex items-center gap-2">
          <div
            className="h-1 rounded-full flex-1 overflow-hidden"
            style={{ background: "var(--border-default)" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${(citation.score * 100).toFixed(0)}%`,
                background: "var(--accent-primary)",
              }}
            />
          </div>
          <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>
            {(citation.score * 100).toFixed(0)}% match
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Citation List ────────────────────────────────────────────
export function CitationList({ citations }: { citations: Citation[] }) {
  return (
    <div className="flex flex-col gap-2 mt-4">
      <p
        className="text-[11px] font-semibold uppercase tracking-widest"
        style={{ color: "var(--text-muted)", letterSpacing: "0.08em" }}
      >
        Sources
      </p>
      <div className="flex flex-col gap-1.5">
        {citations.map((c) => (
          <div
            key={c.sourceId}
            className="flex items-start gap-3 p-3 rounded-lg transition-colors"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5"
              style={{ background: "var(--accent-primary-muted)", color: "var(--accent-primary)" }}
            >
              {c.sourceId}
            </span>
            <div className="flex-1 min-w-0">
              <p
                className="text-[14px] font-medium"
                style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}
              >
                {c.title}
              </p>
              {c.page && (
                <p className="text-[12.5px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Page {c.page}
                </p>
              )}
              <p
                className="text-[13px] mt-1.5 line-clamp-2 leading-relaxed"
                style={{ color: "var(--text-secondary)", fontStyle: "italic" }}
              >
                &ldquo;{c.quote}&rdquo;
              </p>
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
      className="mt-3 p-3.5 rounded-lg text-xs font-mono"
      style={{
        background: "var(--bg-base)",
        border: "1px solid var(--border-subtle)",
        color: "var(--text-secondary)",
      }}
    >
      <p
        className="font-semibold mb-2.5 text-[11px] uppercase tracking-wider"
        style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}
      >
        Debug
      </p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
        {debug.retrievedChunks && (
          <><span style={{ color: "var(--text-muted)" }}>Chunks</span><span>{debug.retrievedChunks}</span></>
        )}
        {debug.topScore && (
          <><span style={{ color: "var(--text-muted)" }}>Top score</span><span>{(debug.topScore * 100).toFixed(0)}%</span></>
        )}
        {debug.model && (
          <><span style={{ color: "var(--text-muted)" }}>Model</span><span>{debug.model}</span></>
        )}
        {debug.latencyMs && (
          <><span style={{ color: "var(--text-muted)" }}>Latency</span><span>{debug.latencyMs}ms</span></>
        )}
        {debug.embeddingModel && (
          <><span style={{ color: "var(--text-muted)" }}>Embeddings</span><span>{debug.embeddingModel}</span></>
        )}
        {debug.retrievalMode && (
          <><span style={{ color: "var(--text-muted)" }}>Mode</span><span>{debug.retrievalMode}</span></>
        )}
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
    <div className={cn("flex gap-3 group animate-fade-in px-4 py-1", isUser ? "justify-end" : "justify-start")}>
      {/* Assistant Avatar only */}
      {!isUser && (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0 mt-1 overflow-hidden"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-default)",
            boxShadow: "0 0 10px rgba(32, 178, 170, 0.15)",
          }}
        >
          <img src="/logo.png" alt="Atlas" className="w-4 h-4 object-contain" />
        </div>
      )}

      {/* Content */}
      <div className={cn("flex flex-col gap-1.5 max-w-2xl min-w-0", isUser && "items-end")}>
        {isUser ? (
          <div
            className="px-4 py-3 rounded-xl text-[15px] leading-relaxed max-w-xl"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
              borderBottomRightRadius: 4,
            }}
          >
            {message.content}
          </div>
        ) : (
          <div>
            {message.isStreaming ? (
              <div className="py-1">
                {message.content ? (
                  <div>
                    <RenderContent
                      content={message.content}
                      citations={citations}
                      onCitationClick={setActiveCitation}
                    />
                    <span className="inline-block w-1.5 h-3.5 ml-1 bg-[var(--accent-primary)] animate-pulse align-middle" />
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 py-1">
                    <TypingIndicator />
                    <span className="text-[13px] text-[var(--text-muted)] animate-pulse">Atlas is thinking…</span>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <RenderContent
                  content={message.content}
                  citations={citations}
                  onCitationClick={setActiveCitation}
                />
                {citations.length > 0 && <CitationList citations={citations} />}
                {activeCitation && (
                  <SourceCard
                    citation={activeCitation}
                    onClose={() => setActiveCitation(null)}
                  />
                )}
                {debug && showDebug && <DebugPanel debug={debug} />}
              </div>
            )}
          </div>
        )}

        {/* Message actions */}
        {!isUser && !message.isStreaming && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 -mt-0.5">
            <CopyButton text={message.content} />
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                className="atlas-btn atlas-btn-ghost py-1 px-2 text-xs gap-1.5 h-7"
              >
                <RefreshCcw size={12} />
                Retry
              </button>
            )}
            {debug && (
              <button
                onClick={() => setShowDebug((v) => !v)}
                className="atlas-btn atlas-btn-ghost py-1 px-2 text-xs gap-1.5 h-7"
              >
                <Bug size={12} />
                Debug
              </button>
            )}
            <span
              className="text-[11px] ml-1.5"
              style={{ color: "var(--text-muted)" }}
            >
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

export function ChatInput({
  onSend,
  isLoading,
  placeholder = "Ask a question about your documents…",
  disabled,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
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

  const hasValue = value.trim().length > 0;

  return (
    <div
      className="px-4 pt-1.5 pb-2.5 flex-shrink-0"
      style={{ borderTop: "1px solid var(--border-subtle)", background: "var(--bg-base)" }}
    >
      <div className="max-w-3xl mx-auto w-full">
        <div
          className="flex items-end gap-2.5 rounded-xl px-3.5 py-2.5 transition-all duration-150"
          style={{
            background: "var(--bg-elevated)",
            border: `1px solid ${isFocused ? "var(--border-focus)" : "var(--border-default)"}`,
            boxShadow: isFocused ? "0 0 0 3px rgba(32, 178, 170, 0.08)" : "none",
          }}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              adjustHeight();
            }}
            onKeyDown={handleKey}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            rows={1}
            className="flex-1 resize-none bg-transparent leading-relaxed p-0 border-none outline-none ring-0 shadow-none focus:outline-none focus:ring-0 focus:border-none focus:shadow-none placeholder:text-[var(--text-muted)]"
            style={{
              color: "var(--text-primary)",
              fontSize: "15px",
              minHeight: "24px",
              maxHeight: "200px",
              fontFamily: "var(--font-sans)",
              letterSpacing: "-0.01em",
              border: "none",
              outline: "none",
              boxShadow: "none",
            }}
            aria-label="Chat input"
          />
          <button
            onClick={submit}
            disabled={!hasValue || isLoading || disabled}
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-150"
            style={{
              background: hasValue && !isLoading ? "var(--accent-primary)" : "var(--bg-hover)",
              color: hasValue && !isLoading ? "#021a19" : "var(--text-muted)",
              transform: hasValue && !isLoading ? "scale(1)" : "scale(0.94)",
            }}
            aria-label="Send message"
          >
            {isLoading ? <Spinner size={12} /> : <Send size={12} strokeWidth={2.5} />}
          </button>
        </div>
        <p
          className="text-[11px] mt-1.5 text-center select-none"
          style={{ color: "var(--text-muted)", letterSpacing: "-0.01em" }}
        >
          <kbd
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
          >
            ↵ Enter
          </kbd>
          {" "}to send ·{" "}
          <kbd
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
          >
            ⇧ Shift+↵
          </kbd>
          {" "}for new line
        </p>
      </div>
    </div>
  );
}

// ─── Scroll-to-Bottom Button ───────────────────────────────────
export function ScrollToBottom({ onClick, visible }: { onClick: () => void; visible: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "absolute bottom-28 right-6 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200",
        visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-2 pointer-events-none"
      )}
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-default)",
        color: "var(--text-secondary)",
        boxShadow: "var(--shadow-md)",
      }}
    >
      <ChevronDown size={15} />
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
        "group flex items-center gap-1.5 px-2.5 py-2 rounded-lg cursor-pointer relative transition-colors",
      )}
      style={{
        background: isActive ? "var(--bg-active)" : "transparent",
        color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
      }}
      onClick={onSelect}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.background = "var(--bg-hover)";
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.background = "transparent";
      }}
    >
      <span
        className="flex-1 min-w-0 text-[12.5px] truncate"
        style={{ letterSpacing: "-0.01em", fontWeight: isActive ? 500 : 400 }}
      >
        {conversation.title}
      </span>

      {/* Context menu */}
      <div className="relative flex-shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-md transition-all"
          style={{ color: "var(--text-muted)" }}
          aria-label="Conversation options"
        >
          <MoreHorizontal size={13} />
        </button>

        {menuOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
              }}
            />
            <div
              className="absolute right-0 top-7 w-40 rounded-xl py-1 z-50 animate-scale-in"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-default)",
                boxShadow: "var(--shadow-lg)",
              }}
            >
              <button
                className="w-full text-left px-3 py-2 text-[12.5px] flex items-center gap-2.5 transition-colors"
                style={{ color: "var(--text-secondary)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                onClick={(e) => {
                  e.stopPropagation();
                  onRename();
                  setMenuOpen(false);
                }}
              >
                <Pencil size={12} />
                Rename
              </button>
              <div
                className="my-1 mx-2"
                style={{ height: 1, background: "var(--border-subtle)" }}
              />
              <button
                className="w-full text-left px-3 py-2 text-[12.5px] flex items-center gap-2.5 transition-colors"
                style={{ color: "var(--status-error)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--status-error-bg)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                  setMenuOpen(false);
                }}
              >
                <Trash2 size={12} />
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
