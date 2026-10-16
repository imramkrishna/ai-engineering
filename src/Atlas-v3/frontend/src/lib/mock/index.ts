import type {
  User,
  Conversation,
  Message,
  Document,
  SearchResult,
  MemoryItem,
  Citation,
  PaginatedResponse,
  MemorySettings,
  UsageStats,
} from "@/types";
import { shortId } from "@/lib/utils";

// ─── Auth ─────────────────────────────────────────────────────
const MOCK_USER: User = {
  id: "user-1",
  name: "Ram Krishna",
  email: "ram@aiengineering.dev",
  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
};

export const mockAuth = {
  login: async (_email: string, _password: string) => {
    await delay(600);
    return { user: MOCK_USER };
  },
  signup: async () => { await delay(800); return { user: MOCK_USER }; },
  logout: async () => { await delay(200); },
  getCurrentUser: async () => { await delay(300); return MOCK_USER; },
  forgotPassword: async () => { await delay(500); },
};

// ─── Conversations ────────────────────────────────────────────
let mockConversations: Conversation[] = [
  {
    id: "conv-1",
    title: "How does pgvector work?",
    createdAt: ago(2),
    updatedAt: ago(2),
    messageCount: 4,
    lastMessage: "pgvector is a PostgreSQL extension...",
    userId: "user-1",
  },
  {
    id: "conv-2",
    title: "Chunking strategies for RAG",
    createdAt: ago(5),
    updatedAt: ago(5),
    messageCount: 7,
    lastMessage: "The most common chunking approaches...",
    userId: "user-1",
  },
  {
    id: "conv-3",
    title: "LangChain vs LlamaIndex",
    createdAt: ago(24),
    updatedAt: ago(24),
    messageCount: 3,
    lastMessage: "Both are popular RAG frameworks...",
    userId: "user-1",
  },
];

const MOCK_CITATIONS: Citation[] = [
  {
    sourceId: 1,
    documentId: "doc-1",
    title: "Designing Distributed Systems",
    page: 42,
    quote: "Kubernetes controllers continuously observe the current state of the system and take action to drive towards the desired state.",
    score: 0.91,
  },
  {
    sourceId: 2,
    documentId: "doc-1",
    title: "Designing Distributed Systems",
    page: 43,
    quote: "The reconciliation loop is the heart of the controller pattern, ensuring eventual consistency.",
    score: 0.87,
  },
];

const mockMessages: Record<string, Message[]> = {
  "conv-1": [
    {
      id: "msg-1",
      conversationId: "conv-1",
      role: "user",
      content: "How does pgvector work?",
      createdAt: ago(2),
    },
    {
      id: "msg-2",
      conversationId: "conv-1",
      role: "assistant",
      content: "pgvector is a PostgreSQL extension that adds support for vector similarity search. It stores embeddings as vector columns and supports operators like `<->` for L2 distance and `<=>` for cosine distance. [1]\n\nThe extension enables you to:\n- Store high-dimensional vectors alongside relational data\n- Build indexes (HNSW or IVFFlat) for approximate nearest-neighbor search\n- Combine vector search with regular SQL filters [2]",
      ragAnswer: {
        answer: "pgvector extends PostgreSQL with vector similarity search...",
        citations: MOCK_CITATIONS,
        answerable: true,
        debugInfo: {
          retrievedChunks: 5,
          topScore: 0.91,
          model: "gpt-4o-mini",
          latencyMs: 820,
          embeddingModel: "text-embedding-3-small",
          retrievalMode: "similarity",
        },
      },
      createdAt: ago(2),
    },
  ],
};

export const mockConversationsApi = {
  list: async (): Promise<Conversation[]> => {
    await delay(400);
    return [...mockConversations];
  },
  get: async (id: string): Promise<Conversation> => {
    await delay(200);
    return mockConversations.find((c) => c.id === id) ?? mockConversations[0];
  },
  create: async (title?: string): Promise<Conversation> => {
    await delay(300);
    const newConv: Conversation = {
      id: `conv-${shortId()}`,
      title: title ?? "New conversation",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messageCount: 0,
      userId: "user-1",
    };
    mockConversations = [newConv, ...mockConversations];
    return newConv;
  },
  rename: async (id: string, title: string): Promise<Conversation> => {
    await delay(200);
    mockConversations = mockConversations.map((c) =>
      c.id === id ? { ...c, title, updatedAt: new Date().toISOString() } : c
    );
    return mockConversations.find((c) => c.id === id)!;
  },
  delete: async (id: string): Promise<void> => {
    await delay(200);
    mockConversations = mockConversations.filter((c) => c.id !== id);
  },
  getMessages: async (id: string): Promise<Message[]> => {
    await delay(350);
    return mockMessages[id] ?? [];
  },
  sendMessage: async (id: string, content: string) => {
    await delay(1200);
    const userMsg: Message = {
      id: `msg-${shortId()}`,
      conversationId: id,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    const assistantMsg: Message = {
      id: `msg-${shortId()}`,
      conversationId: id,
      role: "assistant",
      content: `This is a mock response to: "${content}"\n\nIn a real RAG system, this would be grounded in your uploaded documents. [1]`,
      ragAnswer: {
        answer: "Mock answer",
        citations: [MOCK_CITATIONS[0]],
        answerable: true,
        debugInfo: {
          retrievedChunks: 3,
          topScore: 0.85,
          model: "gpt-4o-mini",
          latencyMs: 950,
        },
      },
      createdAt: new Date().toISOString(),
    };
    if (!mockMessages[id]) mockMessages[id] = [];
    mockMessages[id].push(userMsg, assistantMsg);
    return { message: assistantMsg, conversationId: id };
  },
};

// ─── Documents ────────────────────────────────────────────────
let mockDocuments: Document[] = [
  {
    id: "doc-1",
    title: "Designing Distributed Systems",
    filename: "designing_distributed_systems.pdf",
    fileType: "PDF",
    fileSizeBytes: 2_400_000,
    status: "completed",
    chunkCount: 142,
    embeddingModel: "text-embedding-3-small",
    uploadedAt: ago(24 * 5),
    userId: "user-1",
    tags: ["systems", "distributed", "kubernetes"],
  },
  {
    id: "doc-2",
    title: "LangChain RAG Guide",
    filename: "langchain_rag_guide.pdf",
    fileType: "PDF",
    fileSizeBytes: 850_000,
    status: "completed",
    chunkCount: 67,
    uploadedAt: ago(24 * 3),
    userId: "user-1",
    tags: ["langchain", "rag"],
  },
  {
    id: "doc-3",
    title: "pgvector Documentation",
    filename: "pgvector_docs.pdf",
    fileType: "PDF",
    fileSizeBytes: 320_000,
    status: "processing",
    uploadedAt: ago(1),
    userId: "user-1",
  },
  {
    id: "doc-4",
    title: "Attention Is All You Need",
    filename: "attention_is_all_you_need.pdf",
    fileType: "PDF",
    fileSizeBytes: 1_100_000,
    status: "failed",
    uploadedAt: ago(48),
    userId: "user-1",
    errorMessage: "Failed to extract text from PDF",
  },
];

export const mockDocumentsApi = {
  list: async (params?: { search?: string; status?: string }): Promise<PaginatedResponse<Document>> => {
    await delay(450);
    let docs = [...mockDocuments];
    if (params?.search) {
      const q = params.search.toLowerCase();
      docs = docs.filter((d) => d.title.toLowerCase().includes(q) || d.filename.toLowerCase().includes(q));
    }
    if (params?.status && params.status !== "all") {
      docs = docs.filter((d) => d.status === params.status);
    }
    return { data: docs, total: docs.length, page: 1, pageSize: 20 };
  },
  get: async (id: string): Promise<Document> => {
    await delay(250);
    return mockDocuments.find((d) => d.id === id) ?? mockDocuments[0];
  },
  upload: async (file: File): Promise<{ documentId: string; status: string }> => {
    await delay(1000);
    const newDoc: Document = {
      id: `doc-${shortId()}`,
      title: file.name.replace(/\.[^/.]+$/, ""),
      filename: file.name,
      fileType: file.name.split(".").pop()?.toUpperCase() ?? "FILE",
      fileSizeBytes: file.size,
      status: "processing",
      uploadedAt: new Date().toISOString(),
      userId: "user-1",
    };
    mockDocuments = [newDoc, ...mockDocuments];
    // simulate completion after delay
    setTimeout(() => {
      mockDocuments = mockDocuments.map((d) =>
        d.id === newDoc.id ? { ...d, status: "completed", chunkCount: Math.floor(Math.random() * 80 + 20) } : d
      );
    }, 5000);
    return { documentId: newDoc.id, status: "processing" };
  },
  delete: async (id: string): Promise<void> => {
    await delay(300);
    mockDocuments = mockDocuments.filter((d) => d.id !== id);
  },
  retry: async (id: string): Promise<Document> => {
    await delay(300);
    mockDocuments = mockDocuments.map((d) =>
      d.id === id ? { ...d, status: "processing", errorMessage: undefined } : d
    );
    return mockDocuments.find((d) => d.id === id)!;
  },
};

// ─── Search ───────────────────────────────────────────────────
export const mockSearchApi = {
  search: async (query: string): Promise<{ query: string; results: SearchResult[]; latencyMs: number }> => {
    await delay(800);
    return {
      query,
      latencyMs: 320,
      results: [
        {
          id: "chunk-1",
          documentId: "doc-1",
          documentTitle: "Designing Distributed Systems",
          content: "Kubernetes controllers continuously observe the current state of the system and take action to drive towards the desired state. The reconciliation loop is the heart of the controller pattern.",
          page: 42,
          section: "Controllers",
          score: 0.91,
        },
        {
          id: "chunk-2",
          documentId: "doc-1",
          documentTitle: "Designing Distributed Systems",
          content: "Operators extend the Kubernetes API for managing complex stateful applications. They encode operational knowledge into software using custom resource definitions.",
          page: 58,
          section: "Operators",
          score: 0.84,
        },
        {
          id: "chunk-3",
          documentId: "doc-2",
          documentTitle: "LangChain RAG Guide",
          content: "Retrieval-Augmented Generation (RAG) combines information retrieval with large language models to produce factually grounded responses.",
          page: 3,
          section: "Introduction",
          score: 0.78,
        },
      ],
    };
  },
};

// ─── Memory ───────────────────────────────────────────────────
let mockMemoryItems: MemoryItem[] = [
  {
    id: "mem-1",
    content: "User is building a RAG system with TypeScript and pgvector",
    category: "context",
    createdAt: ago(24 * 7),
    userId: "user-1",
  },
  {
    id: "mem-2",
    content: "User prefers concise, code-focused answers with examples",
    category: "preferences",
    createdAt: ago(24 * 3),
    userId: "user-1",
  },
  {
    id: "mem-3",
    content: "User's stack: Next.js 16, TypeScript, PostgreSQL, LangChain, OpenAI",
    category: "context",
    createdAt: ago(24 * 2),
    userId: "user-1",
  },
];

export const mockMemoryApi = {
  list: async (): Promise<MemoryItem[]> => { await delay(400); return [...mockMemoryItems]; },
  create: async (content: string, category?: string): Promise<MemoryItem> => {
    await delay(300);
    const item: MemoryItem = {
      id: `mem-${shortId()}`,
      content,
      category,
      createdAt: new Date().toISOString(),
      userId: "user-1",
    };
    mockMemoryItems = [item, ...mockMemoryItems];
    return item;
  },
  delete: async (id: string): Promise<void> => {
    await delay(200);
    mockMemoryItems = mockMemoryItems.filter((m) => m.id !== id);
  },
  clear: async (): Promise<void> => { await delay(400); mockMemoryItems = []; },
  getSettings: async (): Promise<MemorySettings> => ({
    enabled: true,
    maxItems: 100,
  }),
  updateSettings: async (s: Partial<MemorySettings>): Promise<MemorySettings> => ({
    enabled: s.enabled ?? true,
    maxItems: s.maxItems ?? 100,
  }),
};

// ─── Account ──────────────────────────────────────────────────
export const mockAccountApi = {
  getProfile: async (): Promise<User> => { await delay(300); return MOCK_USER; },
  getUsage: async (): Promise<UsageStats> => ({
    documentCount: mockDocuments.length,
    conversationCount: mockConversations.length,
    messageCount: 42,
    storageBytes: mockDocuments.reduce((s, d) => s + (d.fileSizeBytes ?? 0), 0),
  }),
};

// ─── Helpers ──────────────────────────────────────────────────
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ago(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}
