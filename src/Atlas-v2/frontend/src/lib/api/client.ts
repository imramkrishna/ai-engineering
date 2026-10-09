import type {
  ApiError,
  ForgotPasswordRequest,
  User,
  Conversation,
  Message,
  SendMessageRequest,
  SendMessageResponse,
  NewChatResponse,
  Document,
  DocumentUploadResponse,
  SearchRequest,
  SearchResponse,
  MemoryItem,
  MemorySettings,
  UsageStats,
  AppSettings,
  PaginatedResponse,
  DocumentStatus,
} from "@/types";

// ─── API Client ───────────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002/api/v1";

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const res = await fetch(url, {
      credentials: "include", // send cookies for session-based auth
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
      ...options,
    });

    if (!res.ok) {
      let errorData: ApiError = { message: "An error occurred", status: res.status };
      try {
        errorData = await res.json();
        errorData.status = res.status;
      } catch {
        // non-JSON error body
      }
      throw errorData;
    }

    // 204 No Content
    if (res.status === 204) return undefined as T;

    return res.json() as Promise<T>;
  }

  async get<T>(path: string, params?: Record<string, string | number | boolean>): Promise<T> {
    const qs = params
      ? "?" + new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString()
      : "";
    return this.request<T>(`${path}${qs}`);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "DELETE" });
  }

  async upload<T>(path: string, formData: FormData): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      body: formData,
      headers: {}, // let browser set multipart/form-data boundary
    });
  }
}

export const api = new ApiClient(BASE_URL);

// ─── Auth ─────────────────────────────────────────────────────
export const authApi = {
  forgotPassword: (data: ForgotPasswordRequest) => api.post<void>("/auth/forgot-password", data),
};

// ─── Conversations / Chat ────────────────────────────────────────────
// The backend exposes the following routes:
//   GET  /api/v1/chat/list   - list all conversations for the authenticated user
//   POST /api/v1/chat/:id    - continue existing conversation
//   POST /api/v1/chat/new    - create new conversation + first message
// Message listing is persisted client-side (localStorage) since the backend
// does not expose a get-messages endpoint. We simulate those GET endpoints.
export const conversationsApi = {
  sendMessage: (conversationId: string, data: SendMessageRequest) =>
    api.post<SendMessageResponse>(`/chat/conversation/${conversationId}`, { conversationId, query: data.content }),
  newChat: (data: SendMessageRequest) =>
    api.post<NewChatResponse>("/chat/new", { query: data.content }),
  list: (): Promise<Conversation[]> =>
    api.get<Conversation[]>("/chat/list"),
  // Simulated GET endpoints using localStorage
  get: (id: string): Promise<Conversation | null> => {
    const stored = localStorage.getItem("atlas-conversations");
    if (!stored) return Promise.resolve(null);
    const conversations: Conversation[] = JSON.parse(stored);
    const conversation = conversations.find(c => c.id === id);
    return Promise.resolve(conversation ?? null);
  },
  getMessages: (conversationId: string): Promise<Message[]> =>
    api.get<{ success: boolean; messages?: Message[]; message?: string }>(`/chat/conversation/${conversationId}`).then(
      (res) => res.messages ?? [],
    ),
};

// ─── Documents ────────────────────────────────────────────────
// The backend exposes: POST /api/v1/upload/new-document, GET /api/v1/upload/documents
// Response shape: { success: boolean; documents?: Document[]; message?: string }
export const documentsApi = {
  upload: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.upload<{ message: string; documentName: string }>(`/upload/new-document`, fd);
  },
  getAll: async (): Promise<Document[]> => {
    const res = await api.get<{ success: boolean; documents?: BackendDocument[]; message?: string }>("/upload/documents");
    if (!res.success) {
      throw new Error(res.message || "Failed to fetch documents");
    }
    return (res.documents ?? []).map(toFrontendDocument);
  },
  // Simulated DELETE/Retry via localStorage (backend has no list/delete/retry endpoints)
  delete: async (id: string) => {
    const stored = localStorage.getItem("atlas-documents");
    if (stored) {
      const docs: Document[] = JSON.parse(stored);
      localStorage.setItem("atlas-documents", JSON.stringify(docs.filter(d => d.id !== id)));
    }
    return Promise.resolve();
  },
  retry: async (id: string) => {
    const stored = localStorage.getItem("atlas-documents");
    if (stored) {
      const docs: Document[] = JSON.parse(stored);
      const updated = docs.map(d => (d.id === id ? { ...d, status: "processing" } : d));
      localStorage.setItem("atlas-documents", JSON.stringify(updated));
    }
    return Promise.resolve();
  },
};

// ─── Backend ↔ Frontend Document Mapping ──────────────────────
// Backend returns different field names than the frontend Document type:
//   Backend:  name, mimeType, size, status, chunkCount, errorMessage, createdAt, updatedAt, processedAt
//   Frontend: title, filename, fileType, fileSizeBytes, status, chunkCount, uploadedAt, errorMessage, userId
interface BackendDocument {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  status: DocumentStatus;
  chunkCount?: number;
  errorMessage?: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
  processedAt?: Date | string;
}

function toFrontendDocument(d: BackendDocument): Document {
  return {
    id: d.id,
    title: d.name,
    filename: d.name,
    fileType: d.mimeType,
    fileSizeBytes: d.size,
    status: d.status,
    chunkCount: d.chunkCount,
    uploadedAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : String(d.createdAt),
    updatedAt: d.updatedAt ? (d.updatedAt instanceof Date ? d.updatedAt.toISOString() : String(d.updatedAt)) : undefined,
    errorMessage: d.errorMessage,
    userId: "", // Not returned by listDocuments query
  };
}

// ─── Search ───────────────────────────────────────────────────
export const searchApi = {
  search: (data: SearchRequest) => api.post<SearchResponse>("/search", data),
};

// ─── Memory ───────────────────────────────────────────────────
export const memoryApi = {
  list: () => api.get<MemoryItem[]>("/memory"),
  create: (content: string, category?: string) =>
    api.post<MemoryItem>("/memory", { content, category }),
  update: (id: string, content: string) => api.patch<MemoryItem>(`/memory/${id}`, { content }),
  delete: (id: string) => api.delete<void>(`/memory/${id}`),
  clear: () => api.delete<void>("/memory"),
  getSettings: () => api.get<MemorySettings>("/memory/settings"),
  updateSettings: (settings: Partial<MemorySettings>) =>
    api.patch<MemorySettings>("/memory/settings", settings),
};

// ─── Account ──────────────────────────────────────────────────
export const accountApi = {
  getProfile: () => api.get<User>("/account/profile"),
  updateProfile: (data: Partial<Pick<User, "name" | "avatarUrl">>) =>
    api.patch<User>("/account/profile", data),
  getUsage: () => api.get<UsageStats>("/account/usage"),
};

// ─── Settings ─────────────────────────────────────────────────
export const settingsApi = {
  get: () => api.get<AppSettings>("/settings"),
  update: (settings: Partial<AppSettings>) => api.patch<AppSettings>("/settings", settings),
};

// ─── Health Check ─────────────────────────────────────────────
export const healthApi = {
  check: () => api.get<{ status: string; timestamp: string }>("/"),
};
