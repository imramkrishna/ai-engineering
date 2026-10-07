import type {
  ApiError,
  LoginRequest,
  SignupRequest,
  ForgotPasswordRequest,
  User,
  Conversation,
  Message,
  SendMessageRequest,
  SendMessageResponse,
  Document,
  DocumentUploadResponse,
  SearchRequest,
  SearchResponse,
  MemoryItem,
  MemorySettings,
  UsageStats,
  AppSettings,
  PaginatedResponse,
} from "@/types";

// ─── API Client ───────────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

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
  login: (data: LoginRequest) => api.post<{ user: User }>("/auth/login", data),
  signup: (data: SignupRequest) => api.post<{ user: User }>("/auth/signup", data),
  logout: () => api.post<void>("/auth/logout"),
  getCurrentUser: () => api.get<User>("/auth/me"),
  forgotPassword: (data: ForgotPasswordRequest) => api.post<void>("/auth/forgot-password", data),
};

// ─── Conversations ────────────────────────────────────────────
export const conversationsApi = {
  list: () => api.get<Conversation[]>("/conversations"),
  get: (id: string) => api.get<Conversation>(`/conversations/${id}`),
  create: (title?: string) => api.post<Conversation>("/conversations", { title }),
  rename: (id: string, title: string) => api.patch<Conversation>(`/conversations/${id}`, { title }),
  delete: (id: string) => api.delete<void>(`/conversations/${id}`),
  getMessages: (id: string) => api.get<Message[]>(`/conversations/${id}/messages`),
  sendMessage: (id: string, data: SendMessageRequest) =>
    api.post<SendMessageResponse>(`/conversations/${id}/messages`, data),
};

// ─── Documents ────────────────────────────────────────────────
export const documentsApi = {
  list: (params?: { search?: string; status?: string; page?: number }) =>
    api.get<PaginatedResponse<Document>>("/documents", params as Record<string, string>),
  get: (id: string) => api.get<Document>(`/documents/${id}`),
  upload: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.upload<DocumentUploadResponse>("/documents/upload", fd);
  },
  delete: (id: string) => api.delete<void>(`/documents/${id}`),
  retry: (id: string) => api.post<Document>(`/documents/${id}/retry`),
  getStatus: (id: string) => api.get<{ status: string; chunkCount?: number }>(`/documents/${id}/status`),
};

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
