"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Trash2, RefreshCw, FileText, Tag, Calendar, Hash, Cpu } from "lucide-react";
import { mockDocumentsApi } from "@/lib/mock";
import type { Document } from "@/types";
import { Button, Badge, Skeleton, ErrorState } from "@/components/ui";
import { StatusBadge } from "@/components/documents";
import { formatBytes, formatDate, formatRelativeDate } from "@/lib/utils";

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [doc, setDoc] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    mockDocumentsApi.get(id)
      .then(setDoc)
      .catch(() => setIsError(true))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Delete this document? This action cannot be undone.")) return;
    await mockDocumentsApi.delete(id);
    router.push("/documents");
  };

  const handleRetry = async () => {
    const updated = await mockDocumentsApi.retry(id);
    setDoc(updated);
  };

  if (isLoading) return (
    <div className="p-6 flex flex-col gap-6 max-w-3xl mx-auto w-full">
      <Skeleton style={{ height: "32px", width: "200px" }} />
      <div className="atlas-card p-6 flex flex-col gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton style={{ height: "14px", width: "100px" }} />
            <Skeleton style={{ height: "14px", width: "200px" }} />
          </div>
        ))}
      </div>
    </div>
  );

  if (isError || !doc) return (
    <div className="p-6 max-w-3xl mx-auto">
      <ErrorState title="Document not found" onRetry={() => { setIsError(false); setIsLoading(true); mockDocumentsApi.get(id).then(setDoc).finally(() => setIsLoading(false)); }} />
    </div>
  );

  const meta = [
    { icon: FileText, label: "File name", value: doc.filename },
    { icon: FileText, label: "File type", value: doc.fileType },
    { icon: Hash, label: "File size", value: doc.fileSizeBytes ? formatBytes(doc.fileSizeBytes) : "Unknown" },
    { icon: Hash, label: "Chunks", value: doc.chunkCount?.toString() ?? "Not indexed" },
    { icon: Cpu, label: "Embedding model", value: doc.embeddingModel ?? "N/A" },
    { icon: Calendar, label: "Uploaded", value: formatDate(doc.uploadedAt) },
    { icon: Calendar, label: "Last updated", value: doc.updatedAt ? formatRelativeDate(doc.updatedAt) : "—" },
  ];

  return (
    <div className="p-6 flex flex-col gap-6 max-w-3xl mx-auto w-full animate-fade-in">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm self-start transition-colors"
        style={{ color: "var(--text-muted)" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
      >
        <ArrowLeft size={16} /> Back to documents
      </button>

      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>{doc.title}</h1>
            <div className="flex items-center gap-2">
              <StatusBadge status={doc.status} />
              {doc.tags?.map((tag) => (
                <span key={tag} className="badge" style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", color: "var(--text-secondary)" }}>
                  <Tag size={9} /> {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {doc.status === "failed" && (
              <Button variant="secondary" size="sm" leftIcon={<RefreshCw size={14} />} onClick={handleRetry}>
                Retry ingestion
              </Button>
            )}
            <Button variant="danger" size="sm" leftIcon={<Trash2 size={14} />} onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Metadata card */}
      <div className="atlas-card p-6 flex flex-col gap-0">
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Document details</h2>
        {meta.map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="flex items-center justify-between py-3"
            style={{ borderBottom: "1px solid var(--border-subtle)" }}
          >
            <div className="flex items-center gap-2">
              <Icon size={14} style={{ color: "var(--text-muted)" }} />
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{label}</span>
            </div>
            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Error message */}
      {doc.status === "failed" && doc.errorMessage && (
        <div
          className="p-4 rounded-[var(--radius-md)] flex flex-col gap-1"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          <p className="text-xs font-semibold" style={{ color: "var(--status-error)" }}>Ingestion failed</p>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{doc.errorMessage}</p>
          <Button variant="danger" size="sm" leftIcon={<RefreshCw size={13} />} onClick={handleRetry} className="mt-2 self-start">
            Retry
          </Button>
        </div>
      )}

      {/* Processing notice */}
      {doc.status === "processing" && (
        <div
          className="p-4 rounded-[var(--radius-md)]"
          style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}
        >
          <p className="text-xs font-semibold mb-1" style={{ color: "#60a5fa" }}>Processing in progress</p>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Your document is being parsed, chunked, and embedded. This may take a few minutes.
          </p>
        </div>
      )}
    </div>
  );
}
