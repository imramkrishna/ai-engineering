"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Grid3X3, List, Filter, Plus } from "lucide-react";
import { toast } from "sonner";
import type { Document, DocumentStatus } from "@/types";
import { PageHeader, Button, Input, EmptyState, ErrorState } from "@/components/ui";
import {
  DocumentCard,
  DocumentTable,
  DocumentSkeleton,
  UploadDropzone,
} from "@/components/documents";
import { debounce } from "@/lib/utils";
import { documentsApi } from "@/lib/api/client";

type ViewMode = "grid" | "table";
type FilterStatus = "all" | DocumentStatus;

const STATUS_FILTERS: { value: FilterStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "completed", label: "Indexed" },
  { value: "processing", label: "Processing" },
  { value: "queued", label: "Queued" },
  { value: "failed", label: "Failed" },
];

export default function DocumentsPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [isUploading, setIsUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const loadDocuments = useCallback(async (q?: string, status?: FilterStatus) => {
    setIsLoading(true);
    setIsError(false);
    try {
      // Since backend doesn't have a list endpoint, we'll use localStorage
      const stored = localStorage.getItem("atlas-documents");
      let docs: Document[] = stored ? JSON.parse(stored) : [];

      // Apply filters
      if (q) {
        docs = docs.filter(doc =>
          doc.title.toLowerCase().includes(q.toLowerCase()) ||
          (doc.filename && doc.filename.toLowerCase().includes(q.toLowerCase()))
        );
      }

      if (status && status !== "all") {
        docs = docs.filter(doc => doc.status === status);
      }

      setDocuments(docs);
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  const debouncedSearch = useCallback(
    debounce((q: string) => loadDocuments(q, statusFilter), 300),
    [loadDocuments, statusFilter]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    debouncedSearch(e.target.value);
  };

  const handleStatusFilter = (status: FilterStatus) => {
    setStatusFilter(status);
    loadDocuments(search, status);
  };

  const handleUpload = async (files: File[]) => {
    setIsUploading(true);
    try {
      for (const file of files) {
        await documentsApi.upload(file);
        toast.success(`Document "${file.name}" uploaded successfully!`);
      }
      setShowUpload(false);
      await loadDocuments(search, statusFilter);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this document? This action cannot be undone.")) return;
    await documentsApi.delete(id);
    setDocuments((d) => d.filter((x) => x.id !== id));
  };

  const handleRetry = async (id: string) => {
    await documentsApi.retry(id);
    setDocuments((d) => d.map((x) => (x.id === id ? { ...x, status: "processing" } : x)));
  };

  return (
    <div className="p-6 flex flex-col gap-6 max-w-6xl mx-auto w-full animate-fade-in">
      <PageHeader
        title="Documents"
        description="Manage your uploaded documents and their indexing status"
        action={
          <Button
            variant="primary"
            leftIcon={<Plus size={15} />}
            onClick={() => setShowUpload((v) => !v)}
          >
            Upload
          </Button>
        }
      />

      {/* Upload zone */}
      {showUpload && (
        <UploadDropzone onFiles={handleUpload} isUploading={isUploading} />
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex-1 w-full sm:max-w-xs">
          <Input
            placeholder="Search documents…"
            value={search}
            onChange={handleSearchChange}
            leftElement={<Search size={15} />}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status filters */}
          <div className="flex items-center gap-1 p-1 rounded-[var(--radius-md)]" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
            {STATUS_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => handleStatusFilter(value)}
                className="px-3 py-1 rounded-[var(--radius-sm)] text-xs font-medium transition-colors"
                style={{
                  background: statusFilter === value ? "var(--bg-active)" : "transparent",
                  color: statusFilter === value ? "var(--text-primary)" : "var(--text-muted)",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* View mode */}
          <div className="flex items-center gap-1 p-1 rounded-[var(--radius-md)]" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
            <button
              onClick={() => setViewMode("grid")}
              className="p-1.5 rounded-[var(--radius-sm)] transition-colors"
              style={{ background: viewMode === "grid" ? "var(--bg-active)" : "transparent", color: "var(--text-muted)" }}
              aria-label="Grid view"
            >
              <Grid3X3 size={15} />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className="p-1.5 rounded-[var(--radius-sm)] transition-colors"
              style={{ background: viewMode === "table" ? "var(--bg-active)" : "transparent", color: "var(--text-muted)" }}
              aria-label="Table view"
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {isError ? (
        <ErrorState description="Failed to load documents" onRetry={() => loadDocuments()} />
      ) : isLoading ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <DocumentSkeleton key={i} />)}
          </div>
        ) : (
          <div className="atlas-card overflow-hidden">
            <div className="flex flex-col gap-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => <DocumentSkeleton key={i} />)}
            </div>
          </div>
        )
      ) : documents.length === 0 ? (
        <EmptyState
          icon={<Search size={20} />}
          title={search ? "No documents found" : "No documents yet"}
          description={search ? `No results for "${search}"` : "Upload your first document to get started."}
          action={
            !search && (
              <Button variant="primary" leftIcon={<Plus size={14} />} onClick={() => setShowUpload(true)}>
                Upload document
              </Button>
            )
          }
        />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onView={() => router.push(`/documents/${doc.id}`)}
              onDelete={() => handleDelete(doc.id)}
              onRetry={() => handleRetry(doc.id)}
            />
          ))}
        </div>
      ) : (
        <div className="atlas-card overflow-hidden">
          <DocumentTable
            documents={documents}
            onView={(id) => router.push(`/documents/${id}`)}
            onDelete={handleDelete}
            onRetry={handleRetry}
          />
        </div>
      )}

      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {documents.length} document{documents.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
