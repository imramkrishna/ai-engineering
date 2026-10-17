/**
 * Centralized Endpoint & Backend Profile Configuration Map
 * --------------------------------------------------------
 * Switching between any AI Engineering backend (Atlas-v3, Prompt-Lab, Information-Assistant,
 * DevAssist, or any external REST API) only requires selecting a profile or updating VITE_API_BASE_URL.
 */

export type BackendProfileId =
  | 'atlas-v3'
  | 'prompt-lab'
  | 'info-assistant'
  | 'dev-assist'
  | 'custom';

export interface EndpointMap {
  health: string;
  chat: string;
  newChat: string;
  conversationById: (id: string) => string;
  conversationsList: string;
  documentsList: string;
  documentUpload: string;
  extract: string;
  toolCall: string;
  similarity: string;
}

export interface BackendProfile {
  id: BackendProfileId;
  name: string;
  badge: string;
  baseUrl: string;
  port: number;
  description: string;
  architecture: string;
  endpoints: EndpointMap;
}

const envBaseUrl = import.meta.env.VITE_API_BASE_URL;

export const BACKEND_PROFILES: Record<BackendProfileId, BackendProfile> = {
  'atlas-v3': {
    id: 'atlas-v3',
    name: 'Atlas v3 (Corrective RAG)',
    badge: 'LangGraph CRAG',
    baseUrl: envBaseUrl || 'http://localhost:3002/api/v1',
    port: 3002,
    description:
      'Full-stack Corrective RAG with query analysis, pgvector retrieval, query rewriting, and citation verification.',
    architecture: 'analyzeQuery ➔ retrieve ➔ rewriteQuery ➔ generate ➔ validate ➔ finalize',
    endpoints: {
      health: '/chat/list',
      chat: '/chat/new',
      newChat: '/chat/new',
      conversationById: (id: string) => `/chat/conversation/${id}`,
      conversationsList: '/chat/list',
      documentsList: '/upload/documents',
      documentUpload: '/upload/new-document',
      extract: '/chat/new',
      toolCall: '/chat/new',
      similarity: '/chat/new',
    },
  },
  'prompt-lab': {
    id: 'prompt-lab',
    name: 'Prompt Lab Server',
    badge: 'Express Playground',
    baseUrl: 'http://localhost:3000',
    port: 3000,
    description:
      'REST playground for SSE chat streaming, Zod structured schema extraction, tool calling, and cosine similarity.',
    architecture: 'Express REST + OpenRouter + OpenAI Embeddings',
    endpoints: {
      health: '/',
      chat: '/chat',
      newChat: '/chat',
      conversationById: (id: string) => `/chat/${id}`,
      conversationsList: '/',
      documentsList: '/',
      documentUpload: '/',
      extract: '/extract',
      toolCall: '/tools',
      similarity: '/similar',
    },
  },
  'info-assistant': {
    id: 'info-assistant',
    name: 'Information Assistant',
    badge: 'Semantic Router',
    baseUrl: 'http://localhost:3001',
    port: 3001,
    description:
      'Multi-turn conversational assistant with semantic intent classification (how-to, troubleshooting, off-topic) and PostgreSQL memory.',
    architecture: 'Intent Classifier ➔ Specialized System Prompt ➔ PostgreSQL Memory',
    endpoints: {
      health: '/',
      chat: '/chat',
      newChat: '/chat',
      conversationById: (id: string) => `/chat?conversationId=${id}`,
      conversationsList: '/conversations',
      documentsList: '/documents',
      documentUpload: '/upload',
      extract: '/chat',
      toolCall: '/chat',
      similarity: '/chat',
    },
  },
  'dev-assist': {
    id: 'dev-assist',
    name: 'DevAssist v2 (Research Agent)',
    badge: 'ReAct + Firecrawl',
    baseUrl: 'http://localhost:3003/api',
    port: 3003,
    description:
      'Autonomous developer research agent equipped with Firecrawl web scraping, PostgreSQL schema inspection, and duplicate-call middleware.',
    architecture: 'Model Planner ➔ Deduplication Middleware ➔ Web/DB Tools ➔ Structured Report',
    endpoints: {
      health: '/health',
      chat: '/research',
      newChat: '/research',
      conversationById: (id: string) => `/research/${id}`,
      conversationsList: '/sessions',
      documentsList: '/docs',
      documentUpload: '/docs/upload',
      extract: '/research',
      toolCall: '/tools/execute',
      similarity: '/similarity',
    },
  },
  custom: {
    id: 'custom',
    name: 'Custom External API',
    badge: 'ENV Configured',
    baseUrl: envBaseUrl || 'http://localhost:8080/api',
    port: 8080,
    description:
      'Drop-in generic REST endpoint map configured via VITE_API_BASE_URL for external microservices.',
    architecture: 'REST / SSE Standard Envelope',
    endpoints: {
      health: '/health',
      chat: '/chat',
      newChat: '/chat/new',
      conversationById: (id: string) => `/conversations/${id}`,
      conversationsList: '/conversations',
      documentsList: '/documents',
      documentUpload: '/documents/upload',
      extract: '/extract',
      toolCall: '/tools',
      similarity: '/similar',
    },
  },
};

export const DEFAULT_PROFILE_ID: BackendProfileId =
  (import.meta.env.VITE_DEFAULT_BACKEND_PROFILE as BackendProfileId) || 'atlas-v3';
