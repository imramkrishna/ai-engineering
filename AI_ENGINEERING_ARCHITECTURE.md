# AI Engineering: Comprehensive Architecture & Learning Guide

## 1. Executive Summary

This repository (`ai-engineering`) is a comprehensive, production-grade curriculum and practical implementation blueprint for modern **AI Engineering** using **TypeScript**, **LangChain**, **LangGraph**, **OpenRouter**, **PostgreSQL (pgvector)**, **Drizzle ORM**, **BullMQ / Redis**, and **Next.js**.

The project is structured into two complementary tracks:
1. **The Conceptual Ladder (`src/stages`)**: Six progressive stages moving from basic LLM runnables up through advanced RAG, tool calling, autonomous ReAct loops, and cyclic LangGraph state machines.
2. **Applied Production Systems**: Fully functional real-world applications (`Prompt-Lab`, `Information-Assistant`, `Ticket-Triage`, `DevAssist-v1/v2`, and `Atlas-v1/v2/v3`) showcasing how these concepts operate in real-world environments with databases, asynchronous ingestion workers, background queues, and web frontends.

---

## 2. High-Level Architectural Map

```mermaid
flowchart TD
    subgraph Core["Shared Infrastructure (src/packages)"]
        MOD["packages/models<br/>OpenRouter (Primary), Gemini (Backup), Embeddings"]
        DB["packages/db<br/>PostgreSQL + pgvector + Drizzle ORM"]
        UTILS["utils<br/>Env validation & finish reasons"]
    end

    subgraph Stages["Core Learning Stages (src/stages)"]
        S1["Stage 1: LLM Foundations & Resilience<br/>Runnables, Fallbacks, Retries"]
        S2["Stage 2: Core RAG Pipeline<br/>PDF Loading, Chunking, Embeddings, pgvector"]
        S3["Stage 3: Advanced RAG & Evaluation<br/>Contextual Chunks, Decomposition, Metadata, OpenEvals"]
        S4["Stage 4: Tool Calling & Error Recovery<br/>Schema Binding, Execution Loop, Error Self-Correction"]
        S5["Stage 5: Autonomous ReAct Agents<br/>Reasoning Loops, Token Budgeting, Deep Research"]
        S6["Stage 6: LangGraph Stateful Workflows<br/>StateGraph, Conditional Routing, Parallelism, Interrupts"]

        S1 --> S2 --> S3 --> S4 --> S5 --> S6
    end

    subgraph Applications["Applied Production Systems"]
        PL["Prompt-Lab<br/>Express API playground for prompting, extraction & similarity"]
        IA["Information-Assistant<br/>Multi-turn chat with conversation memory & DB persistence"]
        TT["Ticket-Triage<br/>LangGraph support ticket classifier, drafter & reviewer"]
        DA["DevAssist (v1 ➔ v2)<br/>Autonomous developer CLI with Firecrawl & DB inspection"]
        AT["Atlas (v1 ➔ v2 ➔ v3)<br/>Full-stack Corrective RAG (Next.js + BullMQ + LangGraph)"]
    end

    Core --> Stages
    Core --> Applications
    Stages -.-> Applications
```

---

## 3. Shared Infrastructure (`src/packages`)

### 3.1 Model Abstraction (`src/packages/models/models.ts`)
Centralizes all LLM and embedding model initializations to decouple business logic from provider configurations:
- **Primary Chat Model**: `ChatOpenRouter` default to `openrouter/free` (or configured via `CHAT_MODEL` env variable), configured with 2 retries and temperature `1`.
- **Embedding Model**: `OpenAIEmbeddings` configured with OpenRouter's API base URL (`https://openrouter.ai/api/v1`), utilizing models such as `liquid/lfm-2.5-embedding-350m:free`.
- **Backup / Fallback Model**: `ChatGoogleGenerativeAI` (`gemini-3.8-flash` or configurable) used for failover resilience whenever OpenRouter or primary models encounter outages or rate limits.

### 3.2 Database Layer (`src/packages/db`)
PostgreSQL managed via **Drizzle ORM** with **pgvector** extension support:
- `client.ts`: Singleton PostgreSQL pool connection export.
- `schema/atlasv1.ts`:
  - `documents`: Document metadata (user ID, storage key, file size, MIME type, status: `queued | processing | completed | failed`, content hash, chunk counts).
  - `documentChunks`: Chunks linked to documents with `vector("embedding", { dimensions: 1024 })` and `jsonb("metadata")`.
  - `ingestionJobs`: Asynchronous background processing job tracking.
- `schema/auth-schema.ts`: Better-Auth authentication tables (`user`, `session`, `account`, `verification`).
- `schema/information-assistant.ts`: Conversation sessions and message histories.
- `schema/devAssist.ts`: Persistent memory and logs for the DevAssist agent.

---

## 4. The 6 Progressive Learning Stages

### Stage 1: LLM Foundations & Resilience (`src/stages/stage1`)
Focuses on LCEL (LangChain Expression Language) and high-availability LLM systems.
- **`runnable.ts`**: Explores `RunnableLambda` and `RunnableSequence`. Demonstrates composability (`chain.invoke()`, `chain.pipe()`), allowing arbitrary functions to integrate smoothly with LLM pipes.
- **`resilience.ts`**: Demonstrates production model resiliency using `.withRetry({ stopAfterAttempt: 3 })` combined with `.withFallbacks([backupModel])`. If primary API calls fail or rate-limit, the pipeline gracefully fails over to Google Gemini.

### Stage 2: Core RAG Pipeline (`src/stages/stage2`)
Walks through the complete classical Retrieval-Augmented Generation flow:
- **`load.ts`**: Extracts text content from binary PDFs using `pdf-parse`.
- **`split.ts`**: Uses `RecursiveCharacterTextSplitter` (configured with `chunkSize: 1200` characters, `chunkOverlap: 150` characters) to maintain semantic cohesion across boundaries.
- **`embeddings.ts`**: Implements chunk batching (`batchSize = 128`) to generate dense vector embeddings without exceeding provider API limits.
- **`store-langchain.ts`**: Indexes chunk embeddings into PostgreSQL using `PGVectorStore` with cosine distance (`distanceStrategy: "cosine"`).
- **`retriever.ts`**: Instantiates a vector retriever (`store.asRetriever({ k: 5 })`) for top-$k$ semantic document lookup.

### Stage 3: Advanced RAG & Evaluation (`src/stages/stage3`)
Enhances baseline RAG into an enterprise-grade retrieval and evaluation pipeline:
- **`contextual-chunks.ts`**: Prepends global document summary context to individual chunks before generating embeddings (Anthropic Contextual Retrieval pattern), eliminating context loss in fragmented chunks.
- **`decompose.ts`**: Implements sub-query decomposition, breaking compound queries into atomic searches.
- **`metadata-filtering.ts`**: Uses LLM structured outputs (`zod`) to extract structured filters (`docType`, `year`, `semanticQuery`) and executes hybrid SQL queries combining vector cosine distance with strict SQL `WHERE` conditions.
- **`dataset.ts`, `eval-retrieval.ts`, `eval-answers.ts`**: RAG benchmark testing using OpenEvals:
  - Retrieval Metrics: Hit Rate, Recall Rate, and Mean Reciprocal Rank (MRR).
  - Answer Quality: Correctness evaluators comparing generated answers against golden reference outputs.

### Stage 4: Tool Calling & Error Recovery (`src/stages/stage4`)
Establishes reliable function calling between LLMs and external systems:
- **`bind.ts`**: Binds tool definitions to the LLM via `.bindTools([...])`.
- **`factory.ts`**: Dynamic tool factory providing tenant/session-scoped database tools (e.g., retrieving only documents matching `ctx.userId`).
- **`error.ts`**: Defensive tool wrapping. Intercepts errors during tool execution and returns formatted diagnostic messages to the model instead of crashing the process, allowing the LLM to inspect the failure and formulate an alternate strategy.
- **`execute.ts` & `runAgent.ts`**: Autonomous single-turn and multi-turn tool execution loop using `HumanMessage`, `AIMessage`, and `ToolMessage`.

### Stage 5: Autonomous ReAct Agents (`src/stages/stage5`)
Constructs goal-directed agents that plan, act, observe, and summarize:
- **`manual-agent.ts`**: Manual implementation of the ReAct (Reasoning + Acting) loop without black-box abstractions.
- **`limit.ts`**: Recursion guards and execution limits preventing runaway agent loops and infinite tool calls.
- **`reliability.ts`**: Middleware (`createMiddleware`) intercepting tool errors and converting them into structured messages: `"Tool failed: ... Try different arguments or another tool"`.
- **`context-tool.ts`**: Passes runtime state/context (e.g. user identity, role permissions) into tools without polluting the LLM's prompt.
- **`structured-report.ts`**: Enforces strict structured output schema (`Report` with `summary`, `findings` array containing claims and evidence citations, and `openQuestions`) using `toolStrategy`.
- **`research-agent.ts`**: Interactive terminal agent capable of performing multi-step research and returning structured dossiers.

### Stage 6: LangGraph Stateful Workflows (`src/stages/stage6`)
Transition from linear chains to cyclical, stateful directed graphs:
- **`state.ts` & `io-schemas.ts`**: Defines strict state schemas using `StateSchema` and `zod` validation, including inputs, outputs, review notes, and revision counters.
- **`conditional-edge.ts`**: Implements routing nodes (`routeMessage`) that dynamically branch execution based on intermediate state classifications.
- **`parallel-execution.ts`**: Fan-out and fan-in graph architectures (e.g., dispatching concurrent queries to both PDF vector stores and knowledge bases, then aggregating them into a single drafting node).
- **`interrupts.ts`**: Human-in-the-loop governance using LangGraph `interrupt()` to pause agent execution before high-stakes actions (e.g., human sign-off on email drafts).

---

## 5. Applied Systems & Evolution

### 5.1 Prompt Lab (`src/Prompt-Lab`)
A modular Express API demonstrating core LLM primitives in HTTP services:
- `POST /chat`: Streaming LLM responses via SSE.
- `POST /extract`: Generic entity extractor supporting multiple schemas (`person`, `product`, `jobSchema`, `orderSchema`).
- `POST /tools`: Bound tool-calling endpoint executing registered functions.
- `POST /similar`: In-memory cosine similarity calculator across batches of questions/FAQs.

### 5.2 Information Assistant (`src/Information-Assistant`)
A persistent conversational assistant:
- Dynamically classifies user intent into categories: `how-to`, `troubleshooting`, or `off-topic`.
- Selects specialized system prompts per category.
- Automatically generates conversation titles and tracks full multi-turn message histories in PostgreSQL.

### 5.3 Ticket Triage System (`src/Ticket-Triage`)
A deterministic customer support graph built using LangGraph:

```mermaid
flowchart LR
    START([START]) --> classify["classifyTicket<br/>(bug, billing, question)"]
    classify --> draftReply["draftReply<br/>(Context-aware response)"]
    draftReply --> reviewReply["reviewReply<br/>(Quality & safety check)"]
    reviewReply --> route{"routeAfterReview"}
    route -- "Needs revision" --> draftReply
    route -- "Approved" --> END([END])
```

- If `reviewReply` spots hallucination or tone issues, it increments `revisions` and loops back to `draftReply`.
- If approved, it terminates at `END`.

### 5.4 DevAssist (v1 ➔ v2) (`src/DevAssist-v1` & `src/DevAssist-v2`)
An autonomous developer research agent:
- **Web Crawling**: Integrated with **Firecrawl** (`lib/firecrawl.ts`) for web search and markdown scraping.
- **Database Introspection**: Direct tools to query database tables, inspect schema details, and execute queries.
- **Deduplication Middleware (`duplicate-call.ts`)**: Normalizes tool arguments and tracks execution history in memory, rejecting identical duplicate tool calls to prevent agent spinning.
- **Streaming Telemetry**: Streams node status (`[model] Planning research`, `[tool] Executing...`) in real time to the terminal.

### 5.5 Atlas Production Platform (v1 ➔ v2 ➔ v3)
Atlas is the flagship enterprise RAG application in this repository.

#### Atlas-v1 (`src/Atlas-v1`)
- **Frontend**: Next.js 16 (App Router), React, Tailwind CSS, Lucide Icons, TanStack Query, Better-Auth client.
- **Backend**: Express API server with Better-Auth cookie-based session management, Multer for file uploads, S3 storage client.
- **Worker**: Redis-backed **BullMQ worker** (`worker.ts`) handling asynchronous ingestion: parsing PDF documents, generating vector embeddings, and storing chunks in PostgreSQL.

#### Atlas-v2 (`src/Atlas-v2`)
- Adds architecture documentation and design patterns for chunk quality verification, citation accuracy, and hybrid RAG routing (`CHUNK-QUALITY-AND-VERIFICATION.md`, `RAG-ROUTING-AND-PIPELINE-DESIGN.md`).

#### Atlas-v3 (`src/Atlas-v3`) — Corrective RAG (CRAG)
Atlas-v3 replaces standard linear RAG with a self-reflecting, corrective LangGraph workflow:

```mermaid
flowchart TD
    START([START]) --> AQ["analyzeQuery<br/>(Extract intent & keywords)"]
    AQ --> RET["retrieve<br/>(pgvector semantic search)"]
    RET --> R_EVAL{"routeAfterRetrieval"}
    
    R_EVAL -- "Sufficient Chunks (>=2)" --> GEN["generate<br/>(Draft answer + strict citations)"]
    R_EVAL -- "Insufficient & Attempts < 3" --> REWRITE["rewriteQuery<br/>(Reformulate search)"]
    REWRITE --> RET
    R_EVAL -- "Failed 3 attempts" --> IC["insufficientContext<br/>(Graceful fallback notice)"]

    GEN --> VAL["validate<br/>(Verify citation quotes in docs)"]
    VAL --> V_EVAL{"routeAfterValidation"}

    V_EVAL -- "Citations Verified" --> FIN["finalize<br/>(Format response & sources)"]
    V_EVAL -- "Citations Invalid & Attempt < 2" --> GEN
    V_EVAL -- "Validation Failed repeatedly" --> IC

    FIN --> END([END])
    IC --> END
```

---

## 6. Database Schema Reference

The database is built on PostgreSQL with `pgvector` enabled and managed via Drizzle ORM:

### 1. Documents Table (`documents`)
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `UUID` (PK) | Unique document identifier |
| `user_id` | `TEXT` (FK) | Reference to `user.id` |
| `name` | `VARCHAR(255)` | Original file name |
| `mime_type` | `VARCHAR(100)` | File MIME type (e.g. `application/pdf`) |
| `size` | `INTEGER` | File size in bytes |
| `storage_key` | `TEXT` | S3 or local storage key |
| `content_hash`| `VARCHAR(64)` | SHA-256 hash for deduplication |
| `status` | `ENUM` | `queued`, `processing`, `completed`, `failed` |
| `chunk_count` | `INTEGER` | Number of split chunks created |
| `created_at` | `TIMESTAMP` | Upload timestamp |

### 2. Document Chunks Table (`document_chunks`)
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `UUID` (PK) | Chunk identifier |
| `document_id` | `UUID` (FK) | Reference to `documents.id` |
| `content` | `TEXT` | Extracted text chunk |
| `chunk_index` | `INTEGER` | Positional index within document |
| `metadata` | `JSONB` | Extracted metadata (page number, headers, docType, year) |
| `embedding` | `VECTOR(1024)` | Dense vector embedding for similarity search |

---

## 7. Configuration & Environment Variables

Required variables in `.env`:

```bash
# Model Providers
OPENROUTER_API_KEY="sk-or-v1-..."
CHAT_MODEL="openrouter/free"
EMBEDDING_MODEL="liquid/lfm-2.5-embedding-350m:free"
GEMINI_API_KEY="AIzaSy..."
GOOGLE_MODEL="gemini-3.8-flash"

# Database & Vector Store
DATABASE_URL="postgresql://user:password@localhost:5432/ai_engineering"

# Caching & Background Queues
REDIS_URL="redis://localhost:6379"

# Web Scraping & External Tools
FIRECRAWL_API_KEY="fc-..."

# Authentication & Application Ports
BETTER_AUTH_SECRET="your-super-secret-key"
BETTER_AUTH_URL="http://localhost:3000"
PORT=3002
```

---

## 8. Summary of Skills & Tooling Demonstrated

1. **Prompt & Chain Engineering**: LCEL, Runnables, Fallbacks, Zod-enforced Structured Output.
2. **Dense Vector Retrieval**: Chunking strategies, Contextual Retrieval, pgvector indexing, Top-$k$ Cosine search.
3. **Advanced RAG**: Query decomposition, Metadata self-query filtering, OpenEvals benchmarking.
4. **Agent Architectures**: Dynamic tool factories, ReAct loops, Deduplication middleware, Execution limits.
5. **Graph Orchestration**: LangGraph StateGraphs, cyclical edges, parallel fan-out/fan-in, human interrupts.
6. **Production Systems**: BullMQ job queues, Redis broker, Better-Auth session security, Next.js UI integration.
