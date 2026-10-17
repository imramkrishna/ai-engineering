import type { BackendProfileId } from '../config/endpoints.config';

export type ExecutionStatus = 'thinking' | 'executing_tool' | 'completed' | 'error';

export interface ExecutionStepLog {
  id: string;
  timestamp: string;
  phase: 'node' | 'tool_call' | 'tool_result' | 'validation' | 'system';
  title: string;
  detail?: string;
  payload?: Record<string, unknown>;
  durationMs?: number;
}

export interface AgentConfig {
  id: string;
  name: string;
  role: string;
  model: string;
  temperature: number;
  backendProfile: BackendProfileId;
  systemPrompt: string;
  tools: string[];
  createdAt: string;
  isPreset?: boolean;
}

export interface StreamEvent {
  status: ExecutionStatus;
  statusLabel: string;
  stepLog?: ExecutionStepLog;
  tokenChunk?: string;
  sources?: Array<{
    documentName: string;
    chunkId: string;
    similarity: number;
    quote: string;
  }>;
}

export const DEFAULT_AGENTS: AgentConfig[] = [
  {
    id: 'atlas-crag',
    name: 'Atlas-v3 CRAG',
    role: 'Corrective RAG & Citation Validator',
    model: 'openrouter/free (Gemini-3.8-Flash Backup)',
    temperature: 0.2,
    backendProfile: 'atlas-v3',
    systemPrompt:
      'You are Atlas, a reliable document-based question-answering assistant with Corrective RAG verification.',
    tools: ['analyzeQuery', 'pgvector_retrieve', 'rewriteQuery', 'verifyCitations'],
    createdAt: '2026-10-17T09:00:00Z',
    isPreset: true,
  },
  {
    id: 'dev-assist',
    name: 'DevAssist-v2',
    role: 'Autonomous Developer & Web Research Agent',
    model: 'google/gemini-3.8-flash',
    temperature: 0.4,
    backendProfile: 'dev-assist',
    systemPrompt:
      'You are an autonomous developer research assistant with Firecrawl web scraping and PostgreSQL schema introspection.',
    tools: ['firecrawl_search', 'firecrawl_scrape', 'inspect_db_schema', 'duplicate_call_guard'],
    createdAt: '2026-10-17T09:05:00Z',
    isPreset: true,
  },
  {
    id: 'ticket-triage',
    name: 'Ticket-Triage Graph',
    role: 'Support Classifier & Reply Reviewer',
    model: 'openrouter/free',
    temperature: 0.1,
    backendProfile: 'info-assistant',
    systemPrompt:
      'Classify incoming support tickets (bug, billing, question), draft a reply, and verify tone and accuracy.',
    tools: ['classifyTicket', 'draftReply', 'reviewReply', 'routeAfterReview'],
    createdAt: '2026-10-17T09:10:00Z',
    isPreset: true,
  },
  {
    id: 'prompt-lab',
    name: 'Prompt-Lab Extractor',
    role: 'Structured Output & Vector Similarity Engine',
    model: 'liquid/lfm-2.5-embedding-350m:free',
    temperature: 0.0,
    backendProfile: 'prompt-lab',
    systemPrompt:
      'Extract strict Zod-validated JSON entities and compute pairwise cosine similarity across FAQ embeddings.',
    tools: ['zod_structured_extract', 'embed_documents', 'cosine_similarity_matrix'],
    createdAt: '2026-10-17T09:15:00Z',
    isPreset: true,
  },
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generates a realistic multi-step execution trace and token stream tailored to the active agent
 * and user query when running in Offline / Auto-Fallback simulation mode.
 */
export async function* simulateAgentExecutionStream(
  query: string,
  agent: AgentConfig,
  signal?: AbortSignal,
): AsyncGenerator<StreamEvent, void, unknown> {
  const now = () => new Date().toLocaleTimeString();

  // Step 1: Initial Thinking / Query Analysis
  yield {
    status: 'thinking',
    statusLabel: `[${agent.name}] Analyzing intent & planning execution graph...`,
    stepLog: {
      id: `step_${Date.now()}_1`,
      timestamp: now(),
      phase: 'node',
      title: 'Node: analyzeQuery (LangGraph START)',
      detail: `Decomposing input query (${query.length} chars) with model ${agent.model}`,
      payload: {
        agentId: agent.id,
        temperature: agent.temperature,
        queryIntent: query.toLowerCase().includes('schema') || query.toLowerCase().includes('db')
          ? 'database_introspection'
          : query.toLowerCase().includes('ticket') || query.toLowerCase().includes('paid')
            ? 'support_triage'
            : 'rag_knowledge_synthesis',
      },
      durationMs: 240,
    },
  };

  await sleep(480);
  if (signal?.aborted) return;

  // Step 2: Tool Call Invocation
  const primaryTool = agent.tools[1] || agent.tools[0] || 'vector_search';
  yield {
    status: 'executing_tool',
    statusLabel: `Executing tool: ${primaryTool}...`,
    stepLog: {
      id: `step_${Date.now()}_2`,
      timestamp: now(),
      phase: 'tool_call',
      title: `Tool Call ➔ ${primaryTool}`,
      detail: 'Dispatching structured tool arguments via middleware',
      payload: {
        tool: primaryTool,
        args: {
          semanticQuery: query,
          topK: 5,
          distanceStrategy: 'cosine',
          deduplicationKey: `${primaryTool}:${query.slice(0, 32).toLowerCase()}`,
        },
      },
      durationMs: 410,
    },
  };

  await sleep(620);
  if (signal?.aborted) return;

  // Step 3: Tool Result Observation
  yield {
    status: 'executing_tool',
    statusLabel: `Observing result from ${primaryTool} (3 chunks matched)...`,
    stepLog: {
      id: `step_${Date.now()}_3`,
      timestamp: now(),
      phase: 'tool_result',
      title: `Tool Result ⬅ ${primaryTool}`,
      detail: 'Retrieved 3 high-similarity chunks from PostgreSQL pgvector (dim: 1024)',
      payload: {
        matchedChunks: 3,
        topSimilarity: 0.942,
        chunkIds: ['chk_902a1f', 'chk_44b8e2', 'chk_19c4d0'],
        middlewareCheck: 'PASS (No duplicate call detected)',
      },
      durationMs: 315,
    },
  };

  await sleep(450);
  if (signal?.aborted) return;

  // Step 4: Validation / Self-Reflection
  yield {
    status: 'thinking',
    statusLabel: `[${agent.name}] Validating citations & synthesizing response...`,
    stepLog: {
      id: `step_${Date.now()}_4`,
      timestamp: now(),
      phase: 'validation',
      title: 'Node: validate & routeAfterValidation',
      detail: 'All generated quotes verified against retrieved document chunks (0 hallucinations)',
      payload: {
        verifiedCitations: 3,
        issues: [],
        nextEdge: 'finalize ➔ END',
      },
      durationMs: 185,
    },
  };

  await sleep(300);
  if (signal?.aborted) return;

  // Step 5: Token-by-token response synthesis
  const responseMarkdown = buildContextualResponse(query, agent);
  const words = responseMarkdown.split(' ');

  for (let i = 0; i < words.length; i += 3) {
    if (signal?.aborted) return;
    const chunk = words.slice(i, i + 3).join(' ') + (i + 3 < words.length ? ' ' : '');
    yield {
      status: 'thinking',
      statusLabel: `Streaming response tokens (${Math.min(100, Math.round(((i + 3) / words.length) * 100))}%)...`,
      tokenChunk: chunk,
    };
    await sleep(38);
  }

  // Final Step: Completed with sources
  yield {
    status: 'completed',
    statusLabel: 'Completed',
    sources: [
      {
        documentName: 'AI_ENGINEERING_ARCHITECTURE.md',
        chunkId: 'chk_902a1f',
        similarity: 0.94,
        quote: 'Atlas-v3 replaces standard linear RAG with a self-reflecting, corrective LangGraph workflow.',
      },
      {
        documentName: 'RAG-ROUTING-AND-PIPELINE-DESIGN.md',
        chunkId: 'chk_44b8e2',
        similarity: 0.89,
        quote: 'Vector search scoped by exact metadata constraints and verified via quote matching.',
      },
    ],
  };
}

function buildContextualResponse(query: string, agent: AgentConfig): string {
  const q = query.toLowerCase();

  if (q.includes('schema') || q.includes('database') || q.includes('table')) {
    return `### PostgreSQL + pgvector Schema Analysis (${agent.name})

Based on live introspection of \`src/packages/db/schema\`, the vector store and application state are organized into **4 primary Drizzle ORM modules**:

1. **\`documents\` & \`document_chunks\`** (\`atlasv1.ts\`):
   - Stores uploaded file metadata (\`status: queued | processing | completed | failed\`, SHA-256 \`content_hash\`).
   - Stores 1024-dimensional embeddings via \`vector("embedding", { dimensions: 1024 })\` indexed on \`document_id\`.
2. **\`ingestion_jobs\`** (\`atlasv1.ts\`):
   - Tracks asynchronous BullMQ worker progress and error traces.
3. **\`user\`, \`session\`, \`account\`** (\`auth-schema.ts\`):
   - Managed by **Better-Auth** for cookie-based session security.

\`\`\`sql
SELECT d.name, dc.chunk_index, 1 - (dc.embedding <=> $1::vector) AS similarity
FROM document_chunks dc
INNER JOIN documents d ON dc.document_id = d.id
WHERE d.user_id = $2
ORDER BY dc.embedding <=> $1::vector
LIMIT 5;
\`\`\``;
  }

  if (q.includes('stage') || q.includes('learn') || q.includes('architecture')) {
    return `### AI Engineering Pipeline Synthesis (${agent.name})

Your query was processed through **${agent.role}** using model \`${agent.model}\`:

- **Stage 1–3 (RAG & Evaluation)**: Combines \`RecursiveCharacterTextSplitter\` (1200 chars, 150 overlap), Anthropic-style contextual chunk headers, and OpenEvals Hit Rate / MRR benchmarking.
- **Stage 4–5 (Tooling & ReAct Agents)**: Uses dynamic session-scoped tool factories, error-recovery wrappers, and canonicalized duplicate-call prevention middleware.
- **Stage 6 (LangGraph Orchestration)**: Uses cyclical \`StateGraph\` nodes (\`analyzeQuery ➔ retrieve ➔ rewriteQuery ➔ generate ➔ validate ➔ finalize\`) to guarantee citation grounding.`;
  }

  return `### Execution Report // ${agent.name}

**Query Processed:** \`"${query}"\`

1. **Intent & Routing**: Classified request and dispatched \`${agent.tools.join(', ')}\` under profile \`${agent.backendProfile}\`.
2. **Retrieval & Context Verification**: Matched **3 verified chunks** (top cosine similarity: \`0.942\`). All citations passed quote validation with zero unsupported claims.
3. **Key Actionable Output**:
   - The centralized API client (\`src/services/api.ts\`) automatically attaches \`Authorization\` and \`X-Request-ID\` headers.
   - To switch live backends at any time, run \`/backend switch <profile>\` or spawn a custom agent with \`/agent create <name>\`.`;
}
