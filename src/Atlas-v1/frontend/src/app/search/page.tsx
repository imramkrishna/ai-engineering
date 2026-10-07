"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, ExternalLink, Zap } from "lucide-react";
import { mockSearchApi } from "@/lib/mock";
import type { SearchResult } from "@/types";
import { PageHeader, Button, EmptyState, ErrorState, Skeleton, Card } from "@/components/ui";
import { formatScore } from "@/lib/utils";

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [lastQuery, setLastQuery] = useState("");

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    setIsLoading(true);
    setIsError(false);
    setResults(null);
    try {
      const res = await mockSearchApi.search(q);
      setResults(res.results);
      setLatency(res.latencyMs ?? null);
      setLastQuery(res.query);
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 0.85) return "var(--status-success)";
    if (score >= 0.7)  return "var(--status-warning)";
    return "var(--text-muted)";
  };

  return (
    <div className="p-6 flex flex-col gap-6 max-w-4xl mx-auto w-full animate-fade-in">
      <PageHeader
        title="Search"
        description="Semantically search across all your indexed documents"
      />

      {/* Search input */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="flex-1 relative flex items-center">
          <Search size={16} className="absolute left-4" style={{ color: "var(--text-muted)" }} />
          <input
            className="atlas-input pl-10 text-sm"
            placeholder="What does the documentation say about…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            aria-label="Search query"
          />
        </div>
        <Button type="submit" variant="primary" isLoading={isLoading}>
          Search
        </Button>
      </form>

      {/* Meta info */}
      {results !== null && !isLoading && (
        <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
          <span>{results.length} results for <strong style={{ color: "var(--text-secondary)" }}>"{lastQuery}"</strong></span>
          {latency && (
            <span className="flex items-center gap-1">
              <Zap size={10} style={{ color: "var(--accent-primary)" }} />
              {latency}ms
            </span>
          )}
        </div>
      )}

      {/* States */}
      {isLoading && (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="atlas-card p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Skeleton style={{ height: "14px", width: "200px" }} />
                <Skeleton style={{ height: "20px", width: "60px" }} />
              </div>
              <Skeleton style={{ height: "12px", width: "120px" }} />
              <Skeleton style={{ height: "14px", width: "100%" }} />
              <Skeleton style={{ height: "14px", width: "85%" }} />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <ErrorState description="Search failed. Please try again." onRetry={handleSearch} />
      )}

      {!isLoading && results !== null && results.length === 0 && (
        <EmptyState
          icon={<Search size={20} />}
          title="No results found"
          description={`No document chunks matched "${lastQuery}". Try a different query or upload more documents.`}
        />
      )}

      {!isLoading && !isError && results === null && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "var(--accent-primary-muted)", color: "var(--accent-primary)" }}
          >
            <Search size={24} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Semantic document search</p>
            <p className="text-xs mt-1 max-w-xs" style={{ color: "var(--text-muted)" }}>
              Enter a natural language query to find relevant passages across your indexed documents.
              This exposes the retrieval layer of your RAG pipeline.
            </p>
          </div>
        </div>
      )}

      {/* Results */}
      {!isLoading && results && results.length > 0 && (
        <div className="flex flex-col gap-4">
          {results.map((result) => (
            <div
              key={result.id}
              className="atlas-card p-5 flex flex-col gap-3 cursor-pointer"
              onClick={() => router.push(`/documents/${result.documentId}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && router.push(`/documents/${result.documentId}`)}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--accent-primary-muted)", color: "var(--accent-primary)" }}
                  >
                    <FileText size={14} />
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {result.documentTitle}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {result.page && `Page ${result.page}`}
                      {result.section && ` · ${result.section}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: `rgba(${hexToRgb(scoreColor(result.score))}, 0.1)`,
                      color: scoreColor(result.score),
                      border: `1px solid rgba(${hexToRgb(scoreColor(result.score))}, 0.25)`,
                    }}
                  >
                    {formatScore(result.score)}
                  </span>
                  <ExternalLink size={14} style={{ color: "var(--text-muted)" }} />
                </div>
              </div>

              {/* Snippet */}
              <blockquote
                className="text-sm leading-relaxed border-l-2 pl-3"
                style={{ borderColor: "var(--border-strong)", color: "var(--text-secondary)" }}
              >
                {result.content}
              </blockquote>

              {/* Score bar */}
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>Relevance</span>
                <div className="flex-1 h-1 rounded-full" style={{ background: "var(--bg-hover)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${result.score * 100}%`, background: scoreColor(result.score) }}
                  />
                </div>
                <span className="text-xs font-medium" style={{ color: scoreColor(result.score) }}>
                  {formatScore(result.score)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function hexToRgb(color: string): string {
  // Return approximate RGB for CSS custom property colors
  if (color === "var(--status-success)") return "34,197,94";
  if (color === "var(--status-warning)") return "245,158,11";
  return "160,160,160";
}
