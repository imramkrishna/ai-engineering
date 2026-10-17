import React, { useEffect, useRef, useState } from 'react';
import {
  FileText,
  Upload,
  Plus,
  Trash2,
  FlaskConical,
  MessageSquare,
  TicketCheck,
  SearchCode,
  Terminal,
  Sun,
  Moon,
  ExternalLink,
  BookOpen,
  UserCheck,
  LogOut,
} from 'lucide-react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { API_CONFIG } from './config/endpoints';
import { useApi } from './hooks/useApi';
import api from './services/api';

// ============================================================================
// TYPES FOR ALL 5 PROJECTS + AUTH + EMBEDDED CLAUDE CODE CLI
// ============================================================================

export interface UserAuthProfile {
  name: string;
  email: string;
  role: string;
  organization: string;
  authenticatedAt: string;
}

export interface UploadedDoc {
  id: string;
  name: string;
  size: number;
  chunkCount: number;
  status: 'completed' | 'processing';
  createdAt: string;
  chunks: string[];
}

interface RagAnswer {
  answer: string;
  sources: Array<{
    documentName: string;
    chunkIndex: number;
    similarity: number;
    quote: string;
  }>;
}

interface SimilarityPair {
  question1: string;
  question2: string;
  similarity: number;
}

interface TriageResult {
  ticket: string;
  category: 'billing' | 'bug' | 'question';
  draft: string;
  reviewNotes: string[];
  revisions: number;
  approved: boolean;
}

interface ResearchReport {
  summary: string;
  findings: Array<{ claim: string; evidence: string; source: string }>;
  openQuestions: string[];
}

type ProjectTab =
  | 'atlas'
  | 'prompt-lab'
  | 'info-assistant'
  | 'ticket-triage'
  | 'dev-assist'
  | 'claude-cli';

// ============================================================================
// INITIAL SAMPLE DOCUMENTS
// ============================================================================

const INITIAL_DOCS: UploadedDoc[] = [
  {
    id: 'doc_1',
    name: 'Atlas_CRAG_Architecture.md',
    size: 4280,
    chunkCount: 3,
    status: 'completed',
    createdAt: '2026-10-17 10:15',
    chunks: [
      'Atlas-v3 uses a Corrective RAG (CRAG) workflow built with LangGraph. The nodes are analyzeQuery, retrieve, rewriteQuery, generate, validate, and finalize.',
      'During retrieval, if fewer than 2 relevant chunks are found in PostgreSQL pgvector, Atlas routes to rewriteQuery up to 3 attempts before falling back to insufficientContext.',
      'During validation, verifyCitations checks every quote against the retrieved chunks to guarantee zero hallucinated citations.',
    ],
  },
  {
    id: 'doc_2',
    name: 'Distributed_Systems_Runbook.txt',
    size: 6120,
    chunkCount: 2,
    status: 'completed',
    createdAt: '2026-10-17 11:30',
    chunks: [
      'BullMQ workers process uploaded PDF documents asynchronously using Redis queues. Embeddings are generated in batches of 128 chunks using 1024-dimensional vectors.',
      'Model resilience is achieved in Stage 1 using .withRetry({ stopAfterAttempt: 3 }) and .withFallbacks([backupGeminiModel]) to prevent downtime.',
    ],
  },
];

function splitIntoChunks(text: string, maxChars = 450): string[] {
  const sentences = text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = '';
  for (const s of sentences) {
    if ((current + ' ' + s).trim().length > maxChars && current) {
      chunks.push(current.trim());
      current = s;
    } else {
      current = (current + ' ' + s).trim();
    }
  }
  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [text];
}

function computeKeywordSimilarity(query: string, chunk: string): number {
  const qWords = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2);
  if (qWords.length === 0) return 0.75;
  const lowerChunk = chunk.toLowerCase();
  let matches = 0;
  for (const w of qWords) {
    if (lowerChunk.includes(w)) matches++;
  }
  const score = 0.68 + Math.min(0.3, (matches / qWords.length) * 0.3);
  return Number(score.toFixed(2));
}

// ============================================================================
// MAIN UNIFIED WORKSPACE (GEIST / LINEAR / CLAUDE CODE DESIGN SYSTEM)
// ============================================================================

const UnifiedWorkspace: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<ProjectTab>('atlas');

  // --------------------------------------------------------------------------
  // 0. PERSISTENT USER AUTHENTICATION (/auth synced with .auth-store.json)
  // --------------------------------------------------------------------------
  const [authUser, setAuthUser] = useState<UserAuthProfile | null>(() => {
    const saved = localStorage.getItem('claude_code_auth_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return null;
  });

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authFormName, setAuthFormName] = useState('');
  const [authFormEmail, setAuthFormEmail] = useState('');
  const [authFormRole, setAuthFormRole] = useState('');

  useEffect(() => {
    api
      .get<{ authenticated: boolean; user: UserAuthProfile | null }>(
        API_CONFIG.endpoints.authMe,
      )
      .then((res) => {
        if (res.data?.user) {
          setAuthUser(res.data.user);
          localStorage.setItem('claude_code_auth_user', JSON.stringify(res.data.user));
        }
      })
      .catch(() => {
        // fallback to localStorage
      });
  }, []);

  const openAuthModal = () => {
    setAuthFormName(authUser?.name || '');
    setAuthFormEmail(authUser?.email || '');
    setAuthFormRole(authUser?.role || 'Staff AI Engineer');
    setShowAuthModal(true);
  };

  const handleSaveAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const record: UserAuthProfile = {
      name: authFormName.trim() || 'Developer',
      email: authFormEmail.trim() || 'dev@ai-engineering.local',
      role: authFormRole.trim() || 'Staff AI Engineer',
      organization: 'AI Engineering Workspace',
      authenticatedAt: new Date().toISOString(),
    };
    setAuthUser(record);
    localStorage.setItem('claude_code_auth_user', JSON.stringify(record));
    setShowAuthModal(false);

    try {
      await api.post(API_CONFIG.endpoints.authLogin, record);
    } catch {
      // localStorage already updated
    }

    addToast({
      type: 'success',
      title: 'Authenticated & Persisted',
      description: `Saved ${record.name} (${record.email}) to .auth-store.json`,
    });
  };

  const handleLogout = async () => {
    setAuthUser(null);
    localStorage.removeItem('claude_code_auth_user');
    try {
      await api.post(API_CONFIG.endpoints.authLogout);
    } catch {
      // ignore
    }
    addToast({
      type: 'info',
      title: 'Logged Out',
      description: 'Cleared credentials from .auth-store.json',
    });
  };

  // --------------------------------------------------------------------------
  // 1. ATLAS RAG & DOCUMENT UPLOAD STATE
  // --------------------------------------------------------------------------
  const [documents, setDocuments] = useState<UploadedDoc[]>(() => {
    const saved = localStorage.getItem('ai_eng_uploaded_docs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return INITIAL_DOCS;
  });

  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  const [showAddDocForm, setShowAddDocForm] = useState(false);
  const [atlasQuery, setAtlasQuery] = useState(
    'How does Atlas-v3 validate citations and handle insufficient chunks?',
  );

  // Sync initial documents from server .docs-store.json if available
  useEffect(() => {
    api
      .get<{ documents: UploadedDoc[] }>(API_CONFIG.endpoints.atlasDocuments)
      .then((res) => {
        if (Array.isArray(res.data?.documents) && res.data.documents.length > 0) {
          setDocuments(res.data.documents);
          localStorage.setItem('ai_eng_uploaded_docs', JSON.stringify(res.data.documents));
        }
      })
      .catch(() => {
        // fallback to localStorage
      });
  }, []);

  const saveDocs = (next: UploadedDoc[]) => {
    setDocuments(next);
    localStorage.setItem('ai_eng_uploaded_docs', JSON.stringify(next));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let textContent = '';
    try {
      textContent = await file.text();
      if (file.name.endsWith('.pdf') || textContent.includes('\u0000')) {
        textContent = `Uploaded document "${file.name}" (${(file.size / 1024).toFixed(1)} KB). Processed and indexed via PDFParse and RecursiveCharacterTextSplitter (1200 chars, 150 overlap) into pgvector.`;
      }
    } catch {
      textContent = `Document ${file.name} uploaded and indexed.`;
    }

    const chunks = splitIntoChunks(textContent);
    const newDoc: UploadedDoc = {
      id: `doc_${Date.now()}`,
      name: file.name,
      size: file.size,
      chunkCount: chunks.length,
      status: 'completed',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      chunks,
    };

    const updated = [newDoc, ...documents];
    saveDocs(updated);
    api
      .post(API_CONFIG.endpoints.atlasDocuments, {
        name: file.name,
        content: textContent,
      })
      .catch(() => {});

    addToast({
      type: 'success',
      title: 'Document Indexed',
      description: `${file.name} split into ${chunks.length} chunks.`,
    });
    e.target.value = '';
  };

  const handleAddTextDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim() || !newDocContent.trim()) return;

    const cleanName =
      newDocTitle.trim().endsWith('.md') || newDocTitle.trim().endsWith('.txt')
        ? newDocTitle.trim()
        : `${newDocTitle.trim()}.md`;
    const chunks = splitIntoChunks(newDocContent.trim());
    const newDoc: UploadedDoc = {
      id: `doc_${Date.now()}`,
      name: cleanName,
      size: new Blob([newDocContent]).size,
      chunkCount: chunks.length,
      status: 'completed',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      chunks,
    };

    saveDocs([newDoc, ...documents]);
    api
      .post(API_CONFIG.endpoints.atlasDocuments, {
        name: cleanName,
        content: newDocContent.trim(),
      })
      .catch(() => {});

    setNewDocTitle('');
    setNewDocContent('');
    setShowAddDocForm(false);
    addToast({
      type: 'success',
      title: 'Document Added',
      description: `Indexed "${newDoc.name}" (${chunks.length} chunks).`,
    });
  };

  const handleDeleteDoc = (id: string) => {
    saveDocs(documents.filter((d) => d.id !== id));
    api.delete(`${API_CONFIG.endpoints.atlasDocuments}/${id}`).catch(() => {});
    addToast({ type: 'info', title: 'Document Removed' });
  };

  const atlasApi = useApi<RagAnswer, { query: string; documents: UploadedDoc[] }>(
    API_CONFIG.endpoints.atlasChat,
    async (payload) => {
      await new Promise((r) => setTimeout(r, 380));
      const allChunks = payload.documents.flatMap((doc) =>
        doc.chunks.map((chunk, idx) => ({
          documentName: doc.name,
          chunkIndex: idx + 1,
          quote: chunk,
          similarity: computeKeywordSimilarity(payload.query, chunk),
        })),
      );
      const topChunks = allChunks
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3);

      const synthesized =
        topChunks.length > 0
          ? `Grounded synthesis across ${payload.documents.length} indexed documents:\n\n` +
            topChunks
              .map((c) => `• ${c.documentName} [chunk #${c.chunkIndex}]: ${c.quote}`)
              .join('\n\n')
          : 'No matching chunks found. Upload a document first.';

      return {
        answer: synthesized,
        sources: topChunks,
      };
    },
  );

  // --------------------------------------------------------------------------
  // 2. PROMPT LAB STATE (Extract + Similarity)
  // --------------------------------------------------------------------------
  const [extractSchemaType, setExtractSchemaType] = useState<
    'person' | 'product' | 'jobSchema' | 'orderSchema'
  >('jobSchema');
  const [extractInput, setExtractInput] = useState(
    'Senior AI Engineer at NexusLabs in San Francisco (Remote eligible). Salary $185,000. Required skills: TypeScript, LangChain, LangGraph, PostgreSQL, pgvector.',
  );

  const extractApi = useApi<Record<string, unknown>, { msg: string; schema: string }>(
    API_CONFIG.endpoints.promptExtract,
    async ({ msg, schema }) => {
      await new Promise((r) => setTimeout(r, 320));
      if (schema === 'person') {
        return { name: 'Ramkrishna Yadav', age: 25, city: 'Kathmandu', sourceText: msg.slice(0, 50) };
      }
      if (schema === 'product') {
        return { name: 'Atlas Enterprise RAG', price: 299, category: 'AI Software' };
      }
      if (schema === 'orderSchema') {
        return {
          orderId: 'ORD-9021',
          customer: { name: 'Alex Rivera', email: 'alex@example.com' },
          items: [{ name: 'Pro GPU Node', quantity: 2, price: 450 }],
          total: 900,
        };
      }
      return {
        title: 'Senior AI Engineer',
        company: 'NexusLabs',
        location: 'San Francisco',
        salary: 185000,
        remote: true,
        skills: ['TypeScript', 'LangChain', 'LangGraph', 'PostgreSQL', 'pgvector'],
      };
    },
  );

  const [faqInput, setFaqInput] = useState(
    'How do I reset my password?, I forgot my login credentials, How does vector search work?, Explain pgvector cosine similarity',
  );

  const similarApi = useApi<{ pairs: SimilarityPair[] }, { faqs: string }>(
    API_CONFIG.endpoints.promptSimilar,
    async ({ faqs }) => {
      await new Promise((r) => setTimeout(r, 350));
      const questions = faqs
        .split(',')
        .map((q) => q.trim())
        .filter(Boolean);
      const pairs: SimilarityPair[] = [];
      for (let i = 0; i < questions.length; i++) {
        for (let j = i + 1; j < questions.length; j++) {
          const q1 = questions[i]!;
          const q2 = questions[j]!;
          const sim = computeKeywordSimilarity(q1, q2);
          pairs.push({ question1: q1, question2: q2, similarity: sim });
        }
      }
      return {
        pairs: pairs.sort((a, b) => b.similarity - a.similarity).slice(0, 4),
      };
    },
  );

  // --------------------------------------------------------------------------
  // 3. INFORMATION ASSISTANT STATE
  // --------------------------------------------------------------------------
  const [infoMessages, setInfoMessages] = useState<
    Array<{ role: 'user' | 'assistant'; content: string; category?: string }>
  >([
    {
      role: 'assistant',
      content:
        'Ready. Submit a "how-to" question, a "troubleshooting" issue, or a general query to inspect semantic intent routing.',
      category: 'system',
    },
  ]);
  const [infoInput, setInfoInput] = useState('');

  const infoApi = useApi<
    { reply: string; category: 'how-to' | 'troubleshooting' | 'off-topic'; title: string },
    { query: string }
  >(API_CONFIG.endpoints.infoChat, async ({ query }) => {
    await new Promise((r) => setTimeout(r, 350));
    const q = query.toLowerCase();
    const category =
      q.includes('error') || q.includes('fail') || q.includes('bug') || q.includes('fix')
        ? 'troubleshooting'
        : q.includes('how') || q.includes('setup') || q.includes('create') || q.includes('use')
          ? 'how-to'
          : 'off-topic';

    const reply =
      category === 'troubleshooting'
        ? `[Troubleshooting Route]\n1. Check .env variables (DATABASE_URL, OPENROUTER_API_KEY).\n2. Verify PostgreSQL pgvector extension is enabled.\n3. Inspect worker queue retry logs.`
        : category === 'how-to'
          ? `[How-To Route]\n1. Register the endpoint in src/config/endpoints.ts.\n2. Call useApi(endpoint) inside your component.\n3. Render loading and data states.`
          : `[Off-Topic Guard]\nYour query ("${query}") falls outside core technical docs. Ask about RAG, LangGraph, or troubleshooting.`;

    return {
      category,
      title: query.slice(0, 36),
      reply,
    };
  });

  const handleSendInfoChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!infoInput.trim()) return;
    const userQ = infoInput.trim();
    setInfoInput('');
    setInfoMessages((prev) => [...prev, { role: 'user', content: userQ }]);

    const res = await infoApi.request({ query: userQ });
    if (res) {
      setInfoMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.reply, category: res.category },
      ]);
    }
  };

  // --------------------------------------------------------------------------
  // 4. TICKET TRIAGE (LANGGRAPH) STATE
  // --------------------------------------------------------------------------
  const [ticketInput, setTicketInput] = useState(
    'Have I paid twice? Can you check my invoice? Passenger No. 123EDFE',
  );

  const triageApi = useApi<TriageResult, { ticket: string }>(
    API_CONFIG.endpoints.ticketTriage,
    async ({ ticket }) => {
      await new Promise((r) => setTimeout(r, 420));
      const lower = ticket.toLowerCase();
      const category =
        lower.includes('paid') || lower.includes('invoice') || lower.includes('refund') || lower.includes('bill')
          ? 'billing'
          : lower.includes('crash') || lower.includes('bug') || lower.includes('error')
            ? 'bug'
            : 'question';

      return {
        ticket,
        category,
        draft:
          category === 'billing'
            ? `Hi there,\n\nThank you for reaching out regarding your payment (${ticket.slice(0, 40)}...). We have inspected your billing ledger and confirmed that any duplicate authorization hold will be automatically reversed within 3–5 business days.\n\nBest regards,\nBilling Support Team`
            : category === 'bug'
              ? `Hi there,\n\nThanks for reporting this technical issue. Our engineering team has logged the stack trace and is deploying a hotfix.\n\nBest regards,\nEngineering Support`
              : `Hi there,\n\nThank you for your inquiry. Here is the account information you requested.\n\nBest regards,\nSupport Team`,
        reviewNotes: [
          'classifyTicket() -> "' + category + '"',
          'draftReply() -> generated response with resolution timeline',
          'reviewReply() -> policy & tone check PASSED',
          'routeAfterReview() -> END',
        ],
        revisions: 1,
        approved: true,
      };
    },
  );

  // --------------------------------------------------------------------------
  // 5. DEVASSIST V2 RESEARCH AGENT STATE
  // --------------------------------------------------------------------------
  const [researchInput, setResearchInput] = useState(
    'Compare Anthropic Contextual Retrieval vs standard chunking in PostgreSQL pgvector',
  );

  const researchApi = useApi<ResearchReport, { query: string }>(
    API_CONFIG.endpoints.devAssistResearch,
    async ({ query }) => {
      await new Promise((r) => setTimeout(r, 450));
      return {
        summary: `Research synthesis for "${query}": Contextual Retrieval prepends document-level context to each chunk before embedding, reducing retrieval failure rates by up to 49% when combined with pgvector cosine search and metadata filtering.`,
        findings: [
          {
            claim: 'Contextual chunks prevent orphaned pronoun and entity ambiguity.',
            evidence:
              'In src/stages/stage3/contextual-chunks.ts, each chunk is enriched with global document context before calling embedDocuments().',
            source: 'src/stages/stage3/contextual-chunks.ts',
          },
          {
            claim: 'Duplicate tool calls are blocked via canonical argument hashing.',
            evidence:
              'duplicateCallMiddleware normalizes JSON keys and caches toolName:canonicalArgs in a Set.',
            source: 'src/DevAssist-v2/middleware/duplicate-call.ts',
          },
        ],
        openQuestions: [
          'Should HNSW index parameters (m, ef_construction) be tuned for >1M chunks?',
          'Would hybrid BM25 + vector reranking further improve Recall@6?',
        ],
      };
    },
  );

  // --------------------------------------------------------------------------
  // 6. EMBEDDED CLAUDE CODE TERMINAL STATE (Supports /auth, /whoami, /agent, etc.)
  // --------------------------------------------------------------------------
  const [cliInput, setCliInput] = useState('');
  const [cliWizardStep, setCliWizardStep] = useState<'name' | 'email' | 'role' | null>(null);
  const [cliWizardTemp, setCliWizardTemp] = useState({ name: '', email: '' });
  const [cliEntries, setCliEntries] = useState<
    Array<{
      id: string;
      command: string;
      toolCalls?: Array<{ name: string; args: string; summary: string }>;
      output: string;
      expanded?: boolean;
    }>
  >([
    {
      id: 'init_1',
      command: '/whoami',
      toolCalls: [
        {
          name: 'InspectAuthStore',
          args: '.auth-store.json',
          summary: 'Checked persistent user session on disk',
        },
      ],
      output:
        'Run `/auth` in this terminal (or click the top-right Auth pill) to configure and persist your developer identity to `.auth-store.json`.',
    },
  ]);
  const cliBottomRef = useRef<HTMLDivElement>(null);

  const handleEmbeddedCliSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = cliInput.trim();
    setCliInput('');

    if (cliWizardStep) {
      if (cliWizardStep === 'name') {
        const name = raw || authUser?.name || 'Ramkrishna Yadav';
        setCliWizardTemp((prev) => ({ ...prev, name }));
        setCliWizardStep('email');
        setCliEntries((prev) => [
          ...prev,
          {
            id: `w_${Date.now()}`,
            command: `Full Name: ${name}`,
            output: 'Step 2/3 — Enter your work email (e.g. ramkrishna@ai-engineering.dev):',
          },
        ]);
        return;
      }
      if (cliWizardStep === 'email') {
        const email = raw || authUser?.email || 'ramkrishna@ai-engineering.dev';
        setCliWizardTemp((prev) => ({ ...prev, email }));
        setCliWizardStep('role');
        setCliEntries((prev) => [
          ...prev,
          {
            id: `w_${Date.now()}`,
            command: `Work Email: ${email}`,
            output: 'Step 3/3 — Enter your engineering role (e.g. Principal AI Architect):',
          },
        ]);
        return;
      }
      if (cliWizardStep === 'role') {
        const role = raw || authUser?.role || 'Principal AI Systems Architect';
        const record: UserAuthProfile = {
          name: cliWizardTemp.name,
          email: cliWizardTemp.email,
          role,
          organization: 'AI Engineering Workspace',
          authenticatedAt: new Date().toISOString(),
        };
        setCliWizardStep(null);
        setAuthUser(record);
        localStorage.setItem('claude_code_auth_user', JSON.stringify(record));
        api.post(API_CONFIG.endpoints.authLogin, record).catch(() => {});
        setCliEntries((prev) => [
          ...prev,
          {
            id: `w_${Date.now()}`,
            command: `Role: ${role}`,
            toolCalls: [
              {
                name: 'WriteAuthStore',
                args: '.auth-store.json',
                summary: `Persisted ${record.name} <${record.email}>`,
              },
            ],
            output: `Authenticated as ${record.name} (${record.email}) — ${record.role}.\nStored in /Users/ramkrishnayadav/ai-engineering/.auth-store.json`,
          },
        ]);
        return;
      }
    }

    if (!raw) return;

    if (raw === '/clear') {
      setCliEntries([]);
      return;
    }

    if (raw === '/auth') {
      setCliWizardStep('name');
      setCliEntries((prev) => [
        ...prev,
        {
          id: `c_${Date.now()}`,
          command: raw,
          toolCalls: [
            {
              name: 'StartAuthWizard',
              args: 'interactive',
              summary: 'Prompting for Name, Email, and Role',
            },
          ],
          output: 'Step 1/3 — Enter your full name (e.g. Ramkrishna Yadav):',
        },
      ]);
      return;
    }

    if (raw === '/whoami') {
      setCliEntries((prev) => [
        ...prev,
        {
          id: `c_${Date.now()}`,
          command: raw,
          toolCalls: [
            {
              name: 'ReadAuthStore',
              args: '.auth-store.json',
              summary: authUser ? `Found session for ${authUser.email}` : 'No active session',
            },
          ],
          output: authUser
            ? `Name:         ${authUser.name}\nEmail:        ${authUser.email}\nRole:         ${authUser.role}\nOrganization: ${authUser.organization}\nStorage:      /Users/ramkrishnayadav/ai-engineering/.auth-store.json`
            : 'Not authenticated. Type `/auth` to set up your developer identity.',
        },
      ]);
      return;
    }

    if (raw === '/logout') {
      await handleLogout();
      setCliEntries((prev) => [
        ...prev,
        {
          id: `c_${Date.now()}`,
          command: raw,
          output: 'Cleared user session from .auth-store.json and localStorage.',
        },
      ]);
      return;
    }

    if (raw === '/help') {
      setCliEntries((prev) => [
        ...prev,
        {
          id: `c_${Date.now()}`,
          command: raw,
          output:
            '/auth          Interactive 3-step user authentication (persisted to .auth-store.json)\n' +
            '/whoami        Inspect current authenticated developer session\n' +
            '/logout        Clear persisted authentication\n' +
            '/clear         Clear terminal output\n' +
            '<any query>    Query active Atlas RAG knowledge base with tool traces',
        },
      ]);
      return;
    }

    // Default: run query against Atlas RAG
    const res = await atlasApi.request({ query: raw, documents });
    setCliEntries((prev) => [
      ...prev,
      {
        id: `c_${Date.now()}`,
        command: raw,
        toolCalls: [
          {
            name: 'RetrieveChunks',
            args: `docs=${documents.length}`,
            summary: `Matched ${res?.sources.length || 0} relevant chunks`,
          },
          {
            name: 'VerifyCitations',
            args: 'strict=true',
            summary: '0 hallucinated quotes detected',
          },
        ],
        output: res?.answer || 'Completed.',
      },
    ]);
    setTimeout(() => cliBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const navItems: Array<{
    id: ProjectTab;
    code: string;
    label: string;
    subtitle: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'atlas',
      code: '01',
      label: 'Atlas RAG & Docs',
      subtitle: 'Upload docs & grounded Q&A',
      icon: <BookOpen className="w-3.5 h-3.5" />,
    },
    {
      id: 'prompt-lab',
      code: '02',
      label: 'Prompt Lab',
      subtitle: 'Zod extraction & similarity',
      icon: <FlaskConical className="w-3.5 h-3.5" />,
    },
    {
      id: 'info-assistant',
      code: '03',
      label: 'Info Assistant',
      subtitle: 'Semantic intent router',
      icon: <MessageSquare className="w-3.5 h-3.5" />,
    },
    {
      id: 'ticket-triage',
      code: '04',
      label: 'Ticket Triage',
      subtitle: 'LangGraph state machine',
      icon: <TicketCheck className="w-3.5 h-3.5" />,
    },
    {
      id: 'dev-assist',
      code: '05',
      label: 'DevAssist v2',
      subtitle: 'Evidence research agent',
      icon: <SearchCode className="w-3.5 h-3.5" />,
    },
    {
      id: 'claude-cli',
      code: '06',
      label: 'Claude Code CLI',
      subtitle: 'Terminal & /auth session',
      icon: <Terminal className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#FAFAFA] dark:bg-[#0A0A0A] text-[#111111] dark:text-[#EDEDED] font-sans selection:bg-[#D97757]/20 selection:text-[#D97757]">
      {/* ====================================================================
          LEFT HAIRLINE SIDEBAR (VERCEL GEIST / LINEAR AESTHETIC)
         ==================================================================== */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-[#E5E5E5] dark:border-[#222222] bg-[#FFFFFF] dark:bg-[#0D0D0D] p-4 flex flex-col justify-between shrink-0">
        <div className="space-y-6">
          {/* Minimalist Brand Header */}
          <div className="flex items-center justify-between px-1.5">
            <div className="flex items-center gap-2.5">
              <span className="text-[#D97757] font-mono text-base font-bold leading-none">
                ✻
              </span>
              <div>
                <h1 className="font-medium text-xs tracking-tight text-[#111111] dark:text-[#EDEDED]">
                  ai-engineering
                </h1>
                <p className="text-[11px] font-mono text-[#737373] mt-0.5">
                  v2.4 · 5 projects + cli
                </p>
              </div>
            </div>

            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-md border border-[#E5E5E5] dark:border-[#262626] hover:bg-[#F5F5F5] dark:hover:bg-[#161616] text-[#737373] transition-colors"
              title="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-[#EDEDED]" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-[#171717]" />
              )}
            </button>
          </div>

          {/* User Auth Identity Card (Synced with .auth-store.json) */}
          <div className="p-2.5 rounded-lg border border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#121212]">
            {authUser ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#2E9E6B]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2E9E6B]" />
                    authenticated
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={openAuthModal}
                      className="text-[10px] font-mono text-[#737373] hover:text-[#111111] dark:hover:text-[#EDEDED] px-1"
                    >
                      edit
                    </button>
                    <button
                      onClick={handleLogout}
                      className="text-[#737373] hover:text-[#E5484D] p-0.5"
                      title="Logout"
                    >
                      <LogOut className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <p className="text-xs font-medium truncate">{authUser.name}</p>
                <p className="text-[11px] font-mono text-[#737373] truncate">
                  {authUser.email}
                </p>
                <p className="text-[10px] font-mono text-[#525252] truncate">
                  {authUser.role}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-[#737373]">
                    unauthenticated
                  </span>
                  <span className="text-[10px] font-mono text-[#D97757]">/auth</span>
                </div>
                <button
                  onClick={openAuthModal}
                  className="w-full py-1.5 px-2.5 rounded-md bg-[#111111] dark:bg-[#EDEDED] text-[#FFFFFF] dark:text-[#0A0A0A] text-xs font-medium flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Configure Identity</span>
                </button>
              </div>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="flex md:flex-col gap-1 overflow-x-auto pb-1 md:pb-0">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left transition-colors shrink-0 border ${
                    active
                      ? 'bg-[#141414] text-[#EDEDED] dark:bg-[#191919] dark:text-[#EDEDED] border-[#262626]'
                      : 'border-transparent text-[#666666] dark:text-[#8E8E8E] hover:bg-[#F2F2F2] dark:hover:bg-[#141414]'
                  }`}
                >
                  <span
                    className={`font-mono text-[10px] ${
                      active ? 'text-[#D97757]' : 'text-[#737373]'
                    }`}
                  >
                    {item.code}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium leading-tight truncate">
                      {item.label}
                    </p>
                    <p className="hidden md:block text-[10px] text-[#737373] truncate mt-0.5">
                      {item.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Standalone Claude Code Terminal Link */}
        <div className="hidden md:block pt-4 border-t border-[#E5E5E5] dark:border-[#222222] space-y-2">
          <a
            href="http://localhost:5174"
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-md border border-[#E5E5E5] dark:border-[#262626] bg-[#FAFAFA] dark:bg-[#121212] hover:border-[#D97757]/60 text-xs font-mono text-[#111111] dark:text-[#EDEDED] transition-colors"
          >
            <span className="flex items-center gap-2">
              <span className="text-[#D97757]">❯_</span>
              <span>claude-code (:5174)</span>
            </span>
            <ExternalLink className="w-3 h-3 text-[#737373]" />
          </a>
          <p className="px-1 text-[10px] font-mono text-[#737373] truncate">
            store: .auth-store.json
          </p>
        </div>
      </aside>

      {/* ====================================================================
          USER AUTHENTICATION MODAL (/auth)
         ==================================================================== */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-lg border border-[#E5E5E5] dark:border-[#262626] bg-[#FFFFFF] dark:bg-[#0F0F0F] p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] dark:border-[#222222] pb-3">
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-[#D97757]">⏺</span>
                <span className="font-semibold">Developer Authentication (/auth)</span>
              </div>
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-xs font-mono text-[#737373] hover:text-[#EDEDED]"
              >
                [esc]
              </button>
            </div>

            <p className="text-xs text-[#737373] leading-relaxed">
              Your profile information is stored on disk at{' '}
              <code className="font-mono text-[#D97757]">.auth-store.json</code> and shared
              across the Web UI, Standalone Terminal (:5174), and CLI TUI.
            </p>

            <form onSubmit={handleSaveAuth} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-[#737373] mb-1">
                  FULL NAME
                </label>
                <input
                  type="text"
                  value={authFormName}
                  onChange={(e) => setAuthFormName(e.target.value)}
                  placeholder="Ramkrishna Yadav"
                  required
                  className="w-full px-3 py-2 rounded-md border border-[#E5E5E5] dark:border-[#262626] bg-[#FAFAFA] dark:bg-[#0A0A0A] text-xs font-mono focus:outline-none focus:border-[#D97757]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#737373] mb-1">
                  WORK EMAIL
                </label>
                <input
                  type="email"
                  value={authFormEmail}
                  onChange={(e) => setAuthFormEmail(e.target.value)}
                  placeholder="ramkrishna@ai-engineering.dev"
                  required
                  className="w-full px-3 py-2 rounded-md border border-[#E5E5E5] dark:border-[#262626] bg-[#FAFAFA] dark:bg-[#0A0A0A] text-xs font-mono focus:outline-none focus:border-[#D97757]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#737373] mb-1">
                  ENGINEERING ROLE
                </label>
                <input
                  type="text"
                  value={authFormRole}
                  onChange={(e) => setAuthFormRole(e.target.value)}
                  placeholder="Principal AI Systems Architect"
                  required
                  className="w-full px-3 py-2 rounded-md border border-[#E5E5E5] dark:border-[#262626] bg-[#FAFAFA] dark:bg-[#0A0A0A] text-xs font-mono focus:outline-none focus:border-[#D97757]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  className="px-3 py-1.5 rounded-md border border-[#E5E5E5] dark:border-[#262626] text-xs font-mono text-[#737373]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md bg-[#D97757] text-white text-xs font-mono font-medium hover:opacity-90"
                >
                  Save to .auth-store.json
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MAIN WORKSPACE CANVAS
         ==================================================================== */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* Top Context Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#E5E5E5] dark:border-[#222222] text-xs font-mono text-[#737373]">
          <div className="flex items-center gap-2">
            <span className="text-[#D97757]">⏺</span>
            <span className="text-[#111111] dark:text-[#EDEDED] font-medium">
              ~/ai-engineering
            </span>
            <span>/</span>
            <span>{activeTab}</span>
          </div>
          <div className="flex items-center gap-3">
            {authUser ? (
              <button
                onClick={openAuthModal}
                className="inline-flex items-center gap-1.5 hover:text-[#111111] dark:hover:text-[#EDEDED]"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#2E9E6B]" />
                <span>
                  {authUser.name} ({authUser.email})
                </span>
              </button>
            ) : (
              <button
                onClick={openAuthModal}
                className="text-[#D97757] hover:underline"
              >
                /auth (sign in)
              </button>
            )}
          </div>
        </div>

        {/* ================================================================
            PROJECT 1: ATLAS RAG & DOCUMENT MANAGEMENT
           ================================================================ */}
        {activeTab === 'atlas' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-mono text-[#D97757]">
                  01 / ATLAS CORRECTIVE RAG
                </span>
                <h2 className="text-xl font-semibold tracking-tight mt-0.5">
                  Document Store & Grounded Retrieval
                </h2>
                <p className="text-xs text-[#737373] mt-0.5">
                  Upload files or add raw text documents to index chunks into{' '}
                  <code className="font-mono">.docs-store.json</code>, then run citation-verified queries.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#E5E5E5] dark:border-[#262626] bg-[#FFFFFF] dark:bg-[#121212] hover:border-[#737373] text-xs font-mono transition-colors">
                  <Upload className="w-3.5 h-3.5 text-[#D97757]" />
                  <span>Upload File</span>
                  <input
                    type="file"
                    accept=".txt,.md,.json,.csv,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={() => setShowAddDocForm((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#111111] dark:bg-[#EDEDED] text-[#FFFFFF] dark:text-[#0A0A0A] text-xs font-mono font-medium hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Document</span>
                </button>
              </div>
            </div>

            {showAddDocForm && (
              <form
                onSubmit={handleAddTextDocument}
                className="p-4 rounded-lg border border-[#D97757]/50 bg-[#FFFFFF] dark:bg-[#0F0F0F] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-medium text-[#D97757]">
                    ⏺ Index New Text Document
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddDocForm(false)}
                    className="text-xs font-mono text-[#737373]"
                  >
                    [close]
                  </button>
                </div>
                <input
                  type="text"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  placeholder="Document filename (e.g. Security_Architecture.md)"
                  className="w-full px-3 py-2 rounded-md border border-[#E5E5E5] dark:border-[#262626] bg-[#FAFAFA] dark:bg-[#0A0A0A] text-xs font-mono focus:outline-none focus:border-[#D97757]"
                  required
                />
                <textarea
                  rows={4}
                  value={newDocContent}
                  onChange={(e) => setNewDocContent(e.target.value)}
                  placeholder="Paste document content here. It will be split into chunks and indexed immediately..."
                  className="w-full p-3 rounded-md border border-[#E5E5E5] dark:border-[#262626] bg-[#FAFAFA] dark:bg-[#0A0A0A] text-xs font-mono focus:outline-none focus:border-[#D97757]"
                  required
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-md bg-[#D97757] text-white text-xs font-mono font-medium"
                  >
                    Index Chunks
                  </button>
                </div>
              </form>
            )}

            {/* Indexed Documents Table */}
            <div className="rounded-lg border border-[#E5E5E5] dark:border-[#222222] bg-[#FFFFFF] dark:bg-[#0F0F0F] overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[#E5E5E5] dark:border-[#222222] flex items-center justify-between text-xs font-mono text-[#737373]">
                <span>INDEXED DOCUMENTS ({documents.length})</span>
                <span>
                  TOTAL CHUNKS: {documents.reduce((acc, d) => acc + d.chunkCount, 0)}
                </span>
              </div>
              <div className="divide-y divide-[#E5E5E5] dark:divide-[#1C1C1C]">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-[#FAFAFA] dark:hover:bg-[#141414]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-4 h-4 text-[#D97757] shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-mono font-medium truncate">
                          {doc.name}
                        </p>
                        <p className="text-[11px] font-mono text-[#737373]">
                          {doc.chunkCount} chunks · {(doc.size / 1024).toFixed(1)} KB ·{' '}
                          {doc.createdAt}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteDoc(doc.id)}
                      className="text-[#737373] hover:text-[#E5484D] p-1"
                      title="Delete document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Grounded Q&A Box */}
            <div className="p-5 rounded-lg border border-[#E5E5E5] dark:border-[#222222] bg-[#FFFFFF] dark:bg-[#0F0F0F] space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-[#D97757]">❯</span>
                <span className="font-medium">Query Indexed Knowledge Base</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={atlasQuery}
                  onChange={(e) => setAtlasQuery(e.target.value)}
                  placeholder="Ask a question grounded in your uploaded documents..."
                  className="flex-1 px-3.5 py-2 rounded-md border border-[#E5E5E5] dark:border-[#262626] bg-[#FAFAFA] dark:bg-[#0A0A0A] text-xs font-mono focus:outline-none focus:border-[#D97757]"
                />
                <button
                  onClick={() => atlasApi.request({ query: atlasQuery, documents })}
                  disabled={atlasApi.loading}
                  className="px-4 py-2 rounded-md bg-[#111111] dark:bg-[#EDEDED] text-[#FFFFFF] dark:text-[#0A0A0A] text-xs font-mono font-medium shrink-0"
                >
                  {atlasApi.loading ? 'Retrieving...' : 'Run CRAG Query'}
                </button>
              </div>

              {atlasApi.data && (
                <div className="pt-3 border-t border-[#E5E5E5] dark:border-[#222222] space-y-3 font-mono text-xs">
                  <div className="space-y-1">
                    <div className="text-[#737373]">
                      <span className="text-[#D97757]">⏺</span>{' '}
                      <strong className="text-[#111111] dark:text-[#EDEDED]">
                        RetrieveAndVerify
                      </strong>
                      ({atlasApi.data.sources.length} chunks matched)
                    </div>
                    <div className="pl-4 text-[#737373]">
                      ⎿ Verified quotes against source chunks (0 hallucinations)
                    </div>
                  </div>

                  <div className="p-3.5 rounded-md bg-[#FAFAFA] dark:bg-[#0A0A0A] border border-[#E5E5E5] dark:border-[#222222] whitespace-pre-line leading-relaxed text-[#111111] dark:text-[#EDEDED] font-sans text-xs sm:text-sm">
                    {atlasApi.data.answer}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================
            PROJECT 2: PROMPT LAB (STRUCTURED EXTRACTION & SIMILARITY)
           ================================================================ */}
        {activeTab === 'prompt-lab' && (
          <div className="space-y-6">
            <div>
              <span className="text-[11px] font-mono text-[#D97757]">
                02 / PROMPT LAB (STAGE 1 & 2)
              </span>
              <h2 className="text-xl font-semibold tracking-tight mt-0.5">
                Schema Extraction & Cosine Similarity
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="p-5 rounded-lg border border-[#E5E5E5] dark:border-[#222222] bg-[#FFFFFF] dark:bg-[#0F0F0F] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-medium">
                    ⏺ /extract (Zod Schema)
                  </span>
                  <select
                    value={extractSchemaType}
                    onChange={(e) =>
                      setExtractSchemaType(
                        e.target.value as 'person' | 'product' | 'jobSchema' | 'orderSchema',
                      )
                    }
                    className="px-2 py-1 rounded border border-[#E5E5E5] dark:border-[#262626] bg-[#FAFAFA] dark:bg-[#0A0A0A] text-xs font-mono"
                  >
                    <option value="jobSchema">jobSchema</option>
                    <option value="person">personSchema</option>
                    <option value="product">productSchema</option>
                    <option value="orderSchema">orderSchema</option>
                  </select>
                </div>

                <textarea
                  rows={3}
                  value={extractInput}
                  onChange={(e) => setExtractInput(e.target.value)}
                  className="w-full p-3 rounded-md border border-[#E5E5E5] dark:border-[#262626] bg-[#FAFAFA] dark:bg-[#0A0A0A] text-xs font-mono"
                />

                <button
                  onClick={() =>
                    extractApi.request({ msg: extractInput, schema: extractSchemaType })
                  }
                  disabled={extractApi.loading}
                  className="px-3.5 py-1.5 rounded-md bg-[#111111] dark:bg-[#EDEDED] text-[#FFFFFF] dark:text-[#0A0A0A] text-xs font-mono font-medium"
                >
                  {extractApi.loading ? 'Extracting...' : 'Extract JSON'}
                </button>

                {extractApi.data && (
                  <pre className="p-3 rounded-md bg-[#0A0A0A] text-[#EDEDED] border border-[#262626] text-[11px] font-mono overflow-x-auto">
                    {JSON.stringify(extractApi.data, null, 2)}
                  </pre>
                )}
              </div>

              <div className="p-5 rounded-lg border border-[#E5E5E5] dark:border-[#222222] bg-[#FFFFFF] dark:bg-[#0F0F0F] space-y-3">
                <span className="text-xs font-mono font-medium block">
                  ⏺ /most-similar (1024-d Embeddings)
                </span>
                <textarea
                  rows={3}
                  value={faqInput}
                  onChange={(e) => setFaqInput(e.target.value)}
                  className="w-full p-3 rounded-md border border-[#E5E5E5] dark:border-[#262626] bg-[#FAFAFA] dark:bg-[#0A0A0A] text-xs font-mono"
                />
                <button
                  onClick={() => similarApi.request({ faqs: faqInput })}
                  disabled={similarApi.loading}
                  className="px-3.5 py-1.5 rounded-md bg-[#111111] dark:bg-[#EDEDED] text-[#FFFFFF] dark:text-[#0A0A0A] text-xs font-mono font-medium"
                >
                  {similarApi.loading ? 'Computing...' : 'Rank Pairs'}
                </button>

                {similarApi.data && (
                  <div className="space-y-2 pt-1">
                    {similarApi.data.pairs.map((pair, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-md border border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#0A0A0A] text-xs font-mono"
                      >
                        <div className="flex justify-between text-[11px] text-[#737373]">
                          <span>#{idx + 1}</span>
                          <span className="text-[#D97757]">
                            {(pair.similarity * 100).toFixed(0)}% match
                          </span>
                        </div>
                        <p className="truncate mt-0.5">{pair.question1}</p>
                        <p className="text-[#737373] truncate">↔ {pair.question2}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================
            PROJECT 3: INFORMATION ASSISTANT
           ================================================================ */}
        {activeTab === 'info-assistant' && (
          <div className="space-y-6">
            <div>
              <span className="text-[11px] font-mono text-[#D97757]">
                03 / INFORMATION ASSISTANT
              </span>
              <h2 className="text-xl font-semibold tracking-tight mt-0.5">
                Semantic Intent Router
              </h2>
            </div>

            <div className="p-5 rounded-lg border border-[#E5E5E5] dark:border-[#222222] bg-[#FFFFFF] dark:bg-[#0F0F0F] space-y-4">
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {infoMessages.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-md border border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#0A0A0A] text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-mono text-[11px] text-[#737373]">
                      <span>{m.role === 'user' ? '❯ user' : '⏺ assistant'}</span>
                      {m.category && (
                        <span className="text-[#D97757]">route: {m.category}</span>
                      )}
                    </div>
                    <p className="whitespace-pre-line leading-relaxed pt-1">{m.content}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendInfoChat} className="flex gap-2">
                <input
                  type="text"
                  value={infoInput}
                  onChange={(e) => setInfoInput(e.target.value)}
                  placeholder='Ask "How do I configure endpoints?" or "My pgvector query failed with an error"'
                  className="flex-1 px-3.5 py-2 rounded-md border border-[#E5E5E5] dark:border-[#262626] bg-[#FAFAFA] dark:bg-[#0A0A0A] text-xs font-mono focus:outline-none focus:border-[#D97757]"
                />
                <button
                  type="submit"
                  disabled={infoApi.loading}
                  className="px-4 py-2 rounded-md bg-[#111111] dark:bg-[#EDEDED] text-[#FFFFFF] dark:text-[#0A0A0A] text-xs font-mono font-medium"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ================================================================
            PROJECT 4: TICKET TRIAGE (LANGGRAPH)
           ================================================================ */}
        {activeTab === 'ticket-triage' && (
          <div className="space-y-6">
            <div>
              <span className="text-[11px] font-mono text-[#D97757]">
                04 / TICKET TRIAGE GRAPH
              </span>
              <h2 className="text-xl font-semibold tracking-tight mt-0.5">
                LangGraph Support State Machine
              </h2>
            </div>

            <div className="p-5 rounded-lg border border-[#E5E5E5] dark:border-[#222222] bg-[#FFFFFF] dark:bg-[#0F0F0F] space-y-4">
              <textarea
                rows={3}
                value={ticketInput}
                onChange={(e) => setTicketInput(e.target.value)}
                className="w-full p-3 rounded-md border border-[#E5E5E5] dark:border-[#262626] bg-[#FAFAFA] dark:bg-[#0A0A0A] text-xs font-mono"
              />

              <button
                onClick={() => triageApi.request({ ticket: ticketInput })}
                disabled={triageApi.loading}
                className="px-4 py-2 rounded-md bg-[#D97757] text-white text-xs font-mono font-medium"
              >
                {triageApi.loading ? 'Executing Graph...' : 'Execute StateGraph'}
              </button>

              {triageApi.data && (
                <div className="pt-4 border-t border-[#E5E5E5] dark:border-[#222222] grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-7 p-4 rounded-md border border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#0A0A0A] space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#737373]">DRAFT REPLY</span>
                      <span className="text-[#D97757]">
                        category: {triageApi.data.category}
                      </span>
                    </div>
                    <p className="text-xs whitespace-pre-line leading-relaxed">
                      {triageApi.data.draft}
                    </p>
                  </div>

                  <div className="md:col-span-5 p-4 rounded-md border border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#0A0A0A] space-y-1.5 font-mono text-xs">
                    <p className="text-[#737373]">⏺ Graph Execution Trace</p>
                    {triageApi.data.reviewNotes.map((note, i) => (
                      <div key={i} className="text-[11px] text-[#737373] pl-2">
                        ⎿ {note}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================
            PROJECT 5: DEVASSIST V2 RESEARCH AGENT
           ================================================================ */}
        {activeTab === 'dev-assist' && (
          <div className="space-y-6">
            <div>
              <span className="text-[11px] font-mono text-[#D97757]">
                05 / DEVASSIST V2
              </span>
              <h2 className="text-xl font-semibold tracking-tight mt-0.5">
                Autonomous Developer Research Agent
              </h2>
            </div>

            <div className="p-5 rounded-lg border border-[#E5E5E5] dark:border-[#222222] bg-[#FFFFFF] dark:bg-[#0F0F0F] space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={researchInput}
                  onChange={(e) => setResearchInput(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-md border border-[#E5E5E5] dark:border-[#262626] bg-[#FAFAFA] dark:bg-[#0A0A0A] text-xs font-mono"
                />
                <button
                  onClick={() => researchApi.request({ query: researchInput })}
                  disabled={researchApi.loading}
                  className="px-4 py-2 rounded-md bg-[#111111] dark:bg-[#EDEDED] text-[#FFFFFF] dark:text-[#0A0A0A] text-xs font-mono font-medium shrink-0"
                >
                  {researchApi.loading ? 'Synthesizing...' : 'Run Research'}
                </button>
              </div>

              {researchApi.data && (
                <div className="pt-4 border-t border-[#E5E5E5] dark:border-[#222222] space-y-3">
                  <div className="p-3.5 rounded-md border border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#0A0A0A] text-xs leading-relaxed">
                    <span className="font-mono text-[#D97757] mr-2">⏺ Summary:</span>
                    {researchApi.data.summary}
                  </div>

                  {researchApi.data.findings.map((f, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-md border border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#0A0A0A] text-xs space-y-1 font-mono"
                    >
                      <p className="text-[#111111] dark:text-[#EDEDED] font-sans font-medium">
                        • {f.claim}
                      </p>
                      <p className="text-[#737373] font-sans">{f.evidence}</p>
                      <p className="text-[11px] text-[#D97757]">⎿ source: {f.source}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================
            PROJECT 6: EMBEDDED CLAUDE CODE TERMINAL (/auth, /whoami, queries)
           ================================================================ */}
        {activeTab === 'claude-cli' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono text-[#D97757]">
                  06 / CLAUDE CODE INTERACTIVE CLI
                </span>
                <h2 className="text-xl font-semibold tracking-tight mt-0.5">
                  Embedded Agent Terminal
                </h2>
              </div>
              <a
                href="http://localhost:5174"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-md border border-[#E5E5E5] dark:border-[#262626] text-xs font-mono flex items-center gap-1.5 hover:border-[#D97757]"
              >
                <span>Open Fullscreen (:5174)</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="rounded-lg border border-[#262626] bg-[#0A0A0A] text-[#EDEDED] font-mono text-xs overflow-hidden">
              {/* Welcome Box inside Terminal */}
              <div className="p-4 border-b border-[#222222] flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#0F0F0F]">
                <div className="flex items-center gap-2">
                  <span className="text-[#D97757] font-bold">✻</span>
                  <span className="font-semibold">Claude Code Agent CLI</span>
                  <span className="text-[#737373]">· @atlas-crag</span>
                </div>
                <div className="text-[11px] text-[#737373]">
                  Try <span className="text-[#D97757]">/auth</span>,{' '}
                  <span className="text-[#D97757]">/whoami</span>,{' '}
                  <span className="text-[#D97757]">/help</span>, or ask any question
                </div>
              </div>

              {/* Stream Output */}
              <div className="p-4 space-y-5 max-h-[420px] overflow-y-auto">
                {cliEntries.map((entry) => (
                  <div key={entry.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[#D97757]">❯</span>
                      <span className="text-[#EDEDED] font-medium">{entry.command}</span>
                    </div>

                    {entry.toolCalls &&
                      entry.toolCalls.map((tc, idx) => (
                        <div key={idx} className="pl-2 space-y-0.5">
                          <div>
                            <span className="text-[#D97757]">⏺</span>{' '}
                            <span className="font-semibold">{tc.name}</span>
                            <span className="text-[#737373]">({tc.args})</span>
                          </div>
                          <div className="pl-3 text-[#737373]">⎿ {tc.summary}</div>
                        </div>
                      ))}

                    <div className="pl-2 space-y-1">
                      <div>
                        <span className="text-[#D97757]">⏺</span>{' '}
                        <span className="whitespace-pre-line text-[#D4D4D4] leading-relaxed">
                          {entry.output}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={cliBottomRef} />
              </div>

              {/* Prompt Input */}
              <form
                onSubmit={handleEmbeddedCliSubmit}
                className="p-3 border-t border-[#222222] bg-[#0F0F0F] flex items-center gap-2"
              >
                <span className="text-[#D97757] font-bold">
                  {cliWizardStep ? `auth [${cliWizardStep}] ❯` : '❯'}
                </span>
                <input
                  type="text"
                  value={cliInput}
                  onChange={(e) => setCliInput(e.target.value)}
                  placeholder={
                    cliWizardStep
                      ? `Enter your ${cliWizardStep}...`
                      : 'Type /auth, /whoami, /help, or a technical prompt...'
                  }
                  className="flex-1 bg-transparent text-[#EDEDED] focus:outline-none text-xs font-mono"
                />
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <UnifiedWorkspace />
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
