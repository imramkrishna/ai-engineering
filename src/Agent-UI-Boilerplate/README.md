# Agent-UI-Boilerplate // Reusable React Dashboard & Agent Terminal UI

A modular, drop-in **React 19 + Vite + TypeScript + Tailwind CSS v4** frontend boilerplate and **Warp-inspired Agent Terminal UI (Web CLI / TUI)** built for the `ai-engineering` ecosystem.

---

## 1. Folder Structure

```text
src/Agent-UI-Boilerplate/
├── .env                          # Environment configuration (VITE_API_BASE_URL, etc.)
├── .env.example                  # Sample environment variables
├── index.html                    # Entry HTML with Inter & JetBrains Mono fonts
├── package.json                  # Project scripts & dependencies
├── tsconfig.json                 # TypeScript bundler configuration
├── vite.config.ts                # Vite + Tailwind v4 plugin configuration
└── src/
    ├── config/
    │   └── endpoints.config.ts   # Single-file Backend Profile & Endpoint Route Map
    ├── services/
    │   ├── api.ts                # Centralized Axios client + Request/Response Interceptors
    │   └── agentSimulator.ts     # Offline multi-step LangGraph / ReAct streaming engine
    ├── hooks/
    │   ├── useApi.ts             # Reusable hook with abort controller & fallback support
    │   └── useTerminal.ts        # Agent CLI parser, history, autocomplete & stream manager
    ├── context/
    │   ├── ThemeContext.tsx      # Dark / Light mode persistence
    │   └── ToastContext.tsx      # Global toast notification stack
    ├── components/
    │   ├── layout/
    │   │   └── DashboardLayout.tsx   # Responsive sidebar, profile switcher, auth & theme bar
    │   ├── dashboard/
    │   │   ├── OverviewDashboard.tsx # Metrics, skeletons, interceptor telemetry, agent cards
    │   │   └── ApiPlaygroundView.tsx # Interactive useApi() & endpoint map tester
    │   ├── terminal/
    │   │   └── AgentTerminal.tsx     # Warp-inspired Web CLI / TUI with collapsible logs
    │   └── ui/
    │       └── Skeleton.tsx          # Reusable shimmer loading skeletons
    ├── App.tsx                   # Main workspace controller
    ├── main.tsx                  # React DOM root
    └── index.css                 # Tailwind v4 imports & custom scrollbars
```

---

## 2. Quick Setup & Run Instructions

```bash
# 1. Install dependencies
npm install --prefix src/Agent-UI-Boilerplate

# 2. Start the development server (runs on http://localhost:5173)
npm run dev --prefix src/Agent-UI-Boilerplate

# 3. Type-check and build for production
npm run build --prefix src/Agent-UI-Boilerplate
```

---

## 3. Centralized API Service & `useApi` Hook

### Switching Backends in One Place
Edit `src/config/endpoints.config.ts` or set `VITE_API_BASE_URL` in `.env`. Pre-configured profiles include:
- `atlas-v3` (`http://localhost:3002/api/v1`)
- `prompt-lab` (`http://localhost:3000`)
- `info-assistant` (`http://localhost:3001`)
- `dev-assist` (`http://localhost:3003/api`)
- `custom` (Any external REST/SSE microservice)

### Using `useApi` in Any Component
```tsx
import { useApi } from '@/hooks/useApi';

const { data, loading, error, isFallbackData, execute } = useApi({
  endpointKey: 'chat',
  method: 'POST',
  immediate: false,
  fallbackData: { message: 'Offline fallback response' },
});
```

---

## 4. Agent Terminal CLI Commands

Inside the **Agent Terminal (TUI)** tab (or maximized standalone mode), you can run natural language prompts or slash commands:

| Command | Example | Description |
| :--- | :--- | :--- |
| `/agent create` | `/agent create sql-pro --model gemini-3.8-flash --role "DB Optimizer"` | Spawn a new AI agent & switch session |
| `/agent switch` | `/agent switch dev-assist` | Switch active agent session |
| `/agent list` | `/agent list` | Render table of all registered agents |
| `/agent config` | `/agent config temp 0.7` | Update active agent `model`, `temp`, `role`, or `prompt` |
| `/agent delete` | `/agent delete sql-pro` | Delete a custom user-spawned agent |
| `/backend switch` | `/backend switch prompt-lab` | Hot-swap centralized API service backend |
| `/mode` | `/mode auto-fallback` | Switch between `auto-fallback`, `live-only`, and `simulate-only` |
| `/clear` | `/clear` | Clear terminal execution blocks |
| `/help` | `/help` | Show interactive command & shortcut guide |
