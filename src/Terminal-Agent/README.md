# Warp Agent Terminal TUI (`src/Terminal-Agent`)

A native, interactive **Terminal User Interface (TUI)** that runs directly inside your terminal (`zsh` / `bash` / macOS Terminal / iTerm2 / Warp) with 24-bit TrueColor ANSI rendering, rounded Warp-style execution blocks, live slash-command autocomplete, arrow-key history, and real-time LLM streaming via [`src/packages/models/models.ts`](file:///Users/ramkrishnayadav/ai-engineering/src/packages/models/models.ts).

---

## 1. How to Launch in Your Terminal

From the repository root (`/Users/ramkrishnayadav/ai-engineering`), run:

```bash
npm run tui
```
*(or directly via `npx tsx src/Terminal-Agent/index.ts`)*

You can also execute one-shot or chained commands directly from your shell:
```bash
npx tsx src/Terminal-Agent/index.ts "/agent list" "Explain Corrective RAG in 3 bullet points" "/logs"
```

---

## 2. Features

- **Interactive Raw-Mode Prompt**:
  - Live syntax highlighting as you type (`/slash` commands in bright emerald, subcommands in cyan, `--flags` in amber, `"strings"` in purple).
  - Floating **Slash Command Autocomplete Menu** rendered directly below the prompt whenever you type `/`.
  - Press `Tab` to auto-complete commands or agent IDs.
  - Press `Up` / `Down` arrows to navigate command history or the autocomplete dropdown.
- **Agent Management via CLI**:
  - `/agent create <name> [--model <id>] [--role "<role>"]` — Spawn and activate a new agent (persisted in `.agents-state.json`).
  - `/agent switch <id>` — Switch active terminal session (`atlas-crag`, `dev-assist`, `ticket-triage`, or any custom agent).
  - `/agent list` — Render a formatted table of all registered agents.
  - `/agent config <model|temp|role|prompt> <value>` — Reconfigure the active agent on the fly.
  - `/agent delete <id>` — Delete a custom agent.
- **Warp-Style Execution Blocks & Collapsible Logs**:
  - Animated Braille status spinners (`⠋ THINKING` ➔ `⠙ EXECUTING TOOL` ➔ `✔ Completed`).
  - Streams live LLM responses via `getChatModel()` (OpenRouter) with automatic failover to `getBackupChatModel()` (Google Gemini) and offline synthesis fallback.
  - Collapses intermediate execution steps into a compact footer (`▸ 4 execution steps completed (type /logs to expand)`), expandable anytime with `/logs`.
