// ─── User / Auth ──────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt: string;
}


export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

// ─── Documents ────────────────────────────────────────────────
export type DocumentStatus = "queued" | "processing" | "completed" | "failed";

export interface Document {
  id: string;
  title: string;
  filename: string;
  fileType: string;
  fileSizeBytes?: number;
  status: DocumentStatus;
  chunkCount?: number;
  embeddingModel?: string;
  uploadedAt: string;
  updatedAt?: string;
  tags?: string[];
  errorMessage?: string;
  userId: string;
}

export interface DocumentUploadResponse {
  documentId: string;
  status: DocumentStatus;
}

// ─── Conversations / Chat ─────────────────────────────────────
export type MessageRole = "user" | "assistant" | "system";

export interface Citation {
  sourceId: number;
  documentId: string;
  title: string;
  page?: number;
  quote: string;
  chunkId?: string;
  score?: number;
}

export interface DebugInfo {
  retrievedChunks: number;
  topScore?: number;
  model?: string;
  latencyMs?: number;
  embeddingModel?: string;
  retrievalMode?: string;
}

export interface RAGAnswer {
  answer: string;
  citations: Citation[];
  answerable: boolean;
  debugInfo?: DebugInfo;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  ragAnswer?: RAGAnswer;
  createdAt: string;
  isStreaming?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
  lastMessage?: string;
  userId: string;
}

export interface SendMessageRequest {
  content: string;
  conversationId?: string;
}

export interface SendMessageResponse {
  message: Message;
  conversationId: string;
}

// ─── Search / Retrieval ───────────────────────────────────────
export interface SearchResult {
  id: string;
  documentId: string;
  documentTitle: string;
  content: string;
  page?: number;
  section?: string;
  score: number;
  chunkIndex?: number;
}

export interface SearchRequest {
  query: string;
  limit?: number;
  threshold?: number;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  latencyMs?: number;
}

// ─── Memory ───────────────────────────────────────────────────
export interface MemoryItem {
  id: string;
  content: string;
  category?: string;
  sourceContext?: string;
  createdAt: string;
  updatedAt?: string;
  userId: string;
}

export interface MemorySettings {
  enabled: boolean;
  maxItems?: number;
}

// ─── Account / Usage ──────────────────────────────────────────
export interface UsageStats {
  documentCount: number;
  conversationCount: number;
  messageCount?: number;
  storageBytes?: number;
}

// ─── Settings ─────────────────────────────────────────────────
export interface RAGSettings {
  topK: number;
  similarityThreshold: number;
  model?: string;
  embeddingModel?: string;
  retrievalMode?: "similarity" | "mmr";
  showCitations: boolean;
}

export interface AppSettings {
  theme: "dark" | "light" | "system";
  rag: RAGSettings;
  memory: MemorySettings;
}

// ─── API Wrappers ─────────────────────────────────────────────
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
