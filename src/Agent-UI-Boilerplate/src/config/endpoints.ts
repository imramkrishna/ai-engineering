/**
 * Centralized Endpoint Map
 * ------------------------
 * Change VITE_API_BASE_URL in .env or edit this single object to point to any backend.
 */

export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3005/api',
  timeout: 20000,
  endpoints: {
    // Auth & Session Persistence (.auth-store.json)
    authMe: '/auth/me',
    authLogin: '/auth/login',
    authLogout: '/auth/logout',

    // 1. Atlas RAG & Document Management (.docs-store.json)
    documentsList: '/atlas/documents',
    atlasDocuments: '/atlas/documents',
    atlasChat: '/atlas/chat',

    // 2. Prompt Lab (Extract, Similarity, Tools)
    promptExtract: '/prompt-lab/extract',
    promptSimilar: '/prompt-lab/similar',
    promptTools: '/prompt-lab/tools',

    // 3. Information Assistant (Intent Router + Conversations)
    infoChat: '/info-assistant/chat',

    // 4. Ticket Triage (LangGraph Classifier -> Draft -> Review)
    ticketTriage: '/ticket-triage/run',

    // 5. DevAssist v2 (Deep Research Report)
    devAssistResearch: '/dev-assist/research',
  },
} as const;

export default API_CONFIG;
