"use client";

import React, { useState, useCallback } from "react";
import {
  Upload,
  FileText,
  Trash2,
  RefreshCw,
  MoreHorizontal,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { cn, formatBytes, formatRelativeDate, getFileExtension } from "@/lib/utils";
import type { Document, DocumentStatus } from "@/types";
import { Badge, Button, EmptyState, ErrorState, Skeleton, Card } from "@/components/ui";

// ─── Status Badge ─────────────────────────────────────────────
const STATUS_CONFIG: Record<DocumentStatus, { label: string; icon: React.ElementType }> = {
  completed:  { label: "Indexed",    icon: CheckCircle2 },
  processing: { label: "Processing", icon: Loader2 },
  failed:     { label: "Failed",     icon: XCircle },
  queued:     { label: "Queued",     icon: Clock },
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  const { label, icon: Icon } = STATUS_CONFIG[status];
  return (
    <Badge variant={status}>
      <Icon size={10} className={status === "processing" ? "animate-spin" : ""} />
      {label}
    </Badge>
  );
}

// ─── Document Card ────────────────────────────────────────────
interface DocumentCardProps {
  document: Document;
  onView: () => void;
  onDelete: () => void;
  onRetry?: () => void;
}

export function DocumentCard({ document: doc, onView, onDelete, onRetry }: DocumentCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        {/* File icon */}
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
          style={{ background: "var(--accent-primary-muted)", color: "var(--accent-primary)" }}
        >
          {getFileExtension(doc.filename)}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{doc.title}</p>
          <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-muted)" }}>{doc.filename}</p>
        </div>

        {/* Actions menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--text-muted)" }}
            aria-label="Document actions"
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "")}
          >
            <MoreHorizontal size={16} />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-8 w-36 rounded-[var(--radius-md)] py-1 z-10"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", boxShadow: "var(--shadow-md)" }}
            >
              <button
                className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors"
                style={{ color: "var(--text-secondary)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                onClick={() => { onView(); setMenuOpen(false); }}
              >
                <Eye size={12} /> View details
              </button>
              {doc.status === "failed" && onRetry && (
                <button
                  className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors"
                  style={{ color: "var(--text-secondary)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  onClick={() => { onRetry(); setMenuOpen(false); }}
                >
                  <RefreshCw size={12} /> Retry ingestion
                </button>
              )}
              <button
                className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors"
                style={{ color: "var(--status-error)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                onClick={() => { onDelete(); setMenuOpen(false); }}
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center justify-between gap-2">
        <StatusBadge status={doc.status} />
        <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
          {doc.fileSizeBytes && <span>{formatBytes(doc.fileSizeBytes)}</span>}
          {doc.chunkCount && <span>{doc.chunkCount} chunks</span>}
          <span>{formatRelativeDate(doc.uploadedAt)}</span>
        </div>
      </div>

      {doc.status === "failed" && doc.errorMessage && (
        <p className="text-xs px-2 py-1.5 rounded" style={{ background: "rgba(239,68,68,0.08)", color: "var(--status-error)" }}>
          {doc.errorMessage}
        </p>
      )}
    </Card>
  );
}

// ─── Document Row (table) ─────────────────────────────────────
export function DocumentRow({ document: doc, onView, onDelete, onRetry }: DocumentCardProps) {
  return (
    <tr
      className="border-b transition-colors cursor-pointer"
      style={{ borderColor: "var(--border-subtle)" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "")}
      onClick={onView}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: "var(--accent-primary-muted)", color: "var(--accent-primary)" }}
          >
            {getFileExtension(doc.filename)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)", maxWidth: "240px" }}>{doc.title}</p>
            <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{doc.filename}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={doc.status} />
      </td>
      <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>
        {doc.chunkCount ?? "—"}
      </td>
      <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>
        {doc.fileSizeBytes ? formatBytes(doc.fileSizeBytes) : "—"}
      </td>
      <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>
        {formatRelativeDate(doc.uploadedAt)}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {doc.status === "failed" && onRetry && (
            <button
              onClick={onRetry}
              className="p-1.5 rounded transition-colors"
              style={{ color: "var(--text-muted)" }}
              aria-label="Retry ingestion"
              title="Retry ingestion"
            >
              <RefreshCw size={14} />
            </button>
          )}
          <button
            onClick={onDelete}
            className="p-1.5 rounded transition-colors"
            style={{ color: "var(--text-muted)" }}
            aria-label="Delete document"
            title="Delete document"
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--status-error)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Document Table ───────────────────────────────────────────
export function DocumentTable({ documents, onView, onDelete, onRetry }: {
  documents: Document[];
  onView: (id: string) => void;
  onDelete: (id: string) => void;
  onRetry: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            {["Document", "Status", "Chunks", "Size", "Uploaded", ""].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--text-muted)" }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <DocumentRow
              key={doc.id}
              document={doc}
              onView={() => onView(doc.id)}
              onDelete={() => onDelete(doc.id)}
              onRetry={() => onRetry(doc.id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Document Skeleton ────────────────────────────────────────
export function DocumentSkeleton() {
  return (
    <div className="atlas-card p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <Skeleton className="w-9 h-9 rounded-lg" />
        <div className="flex-1 flex flex-col gap-2">
          <Skeleton style={{ height: "14px", width: "60%" }} />
          <Skeleton style={{ height: "12px", width: "40%" }} />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Skeleton style={{ height: "20px", width: "80px" }} />
        <Skeleton style={{ height: "12px", width: "100px" }} />
      </div>
    </div>
  );
}

// ─── Upload Dropzone ──────────────────────────────────────────
interface UploadDropzoneProps {
  onFiles: (files: File[]) => void;
  isUploading?: boolean;
  accept?: string;
}

export function UploadDropzone({ onFiles, isUploading, accept = ".pdf,.txt,.md,.docx" }: UploadDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFiles(files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) onFiles(files);
  };

  return (
    <div
      className={cn("dropzone", dragOver && "drag-over")}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => !isUploading && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      aria-label="Upload document"
      onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
        multiple
      />
      {isUploading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin" style={{ color: "var(--accent-primary)" }} />
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Uploading & processing…</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: "var(--accent-primary-muted)", color: "var(--accent-primary)" }}
          >
            <Upload size={22} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              Drop files here or <span style={{ color: "var(--accent-primary)" }}>browse</span>
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              PDF, TXT, MD, DOCX supported
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// fix missing useRef import — already included via React hooks
const { useRef } = React;
