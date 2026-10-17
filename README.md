# AI Engineering

A hands-on AI engineering project built with **TypeScript**, **LangChain**, **OpenRouter**, **PostgreSQL**, and **pgvector**.

The project progressively explores modern LLM application development, starting from basic LLM calls and chains, then moving into embeddings, vector search, RAG, agents, and eventually LangGraph-based workflows.

---

## 🚀 Goals

This project is designed to build practical understanding of:

- LLM integration
- Prompt engineering
- LangChain
- OpenRouter
- Text embeddings
- Vector databases
- PostgreSQL + pgvector
- Retrieval-Augmented Generation (RAG)
- Tool calling
- AI agents
- LangGraph
- Stateful AI workflows
- Structured outputs
- Production-oriented AI application architecture

---

## 🏗️ Project Structure

For full architectural details, data flow diagrams, and deep dives into each stage and system, see **[AI_ENGINEERING_ARCHITECTURE.md](file:///Users/ramkrishnayadav/ai-engineering/AI_ENGINEERING_ARCHITECTURE.md)**.

```text
ai-engineering/
├── src/
│   ├── packages/                     # Shared models & PostgreSQL/pgvector database
│   │   ├── models/                   # OpenRouter, Gemini fallback, embeddings
│   │   └── db/                       # Drizzle ORM client, schemas, migrations
│   ├── stages/                       # Core progressive learning curriculum
│   │   ├── stage1/                   # LCEL runnables & model resilience/failover
│   │   ├── stage2/                   # Core RAG (load, split, embed, pgvector store)
│   │   ├── stage3/                   # Advanced RAG (contextual chunks, eval, metadata)
│   │   ├── stage4/                   # Tool calling, factory, error recovery
│   │   ├── stage5/                   # Autonomous ReAct agents & research reports
│   │   └── stage6/                   # LangGraph state graphs, conditional edges, interrupts
│   ├── Prompt-Lab/                   # Express playground for chat, extract, tools, similarity
│   ├── Information-Assistant/        # Multi-turn chat assistant with DB memory
│   ├── Ticket-Triage/                # LangGraph customer support ticket graph
│   ├── DevAssist-v1 & DevAssist-v2/  # Autonomous developer agent (Firecrawl + DB tools)
│   ├── Atlas-v1, v2, v3/             # Full-stack production Corrective RAG (Next.js + BullMQ)
│   ├── Agent-UI-Boilerplate/         # Reusable React Dashboard & Warp-style Agent Terminal UI
│   └── utils/                        # Helper utilities (environment, finish reasons)
├── AI_ENGINEERING_ARCHITECTURE.md    # In-depth architectural guide & diagrams
├── package.json
├── tsconfig.json
└── README.md
```