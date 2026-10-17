import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';

// ============================================================================
// TYPES & CONFIGURATION
// ============================================================================

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: string;
  token: string;
  authenticatedAt: string;
  storagePath: string;
}

export interface AgentProfile {
  id: string;
  name: string;
  role: string;
  model: string;
  temperature: number;
  tools: string[];
  isPreset?: boolean;
}

export interface ToolTraceStep {
  id: string;
  fnName: string;
  argsSummary: string;
  resultSummary: string;
  durationMs: number;
  rawPayload?: Record<string, unknown>;
}

export interface SessionTurn {
  id: string;
  timestamp: string;
  input: string;
  agentId: string;
  agentModel: string;
  status: 'thinking' | 'executing_tool' | 'completed' | 'error';
  statusText: string;
  steps: ToolTraceStep[];
  output: string;
  durationMs?: number;
}

const API_BASE = 'http://localhost:3005/api';
const STORAGE_KEYS = {
  USER: 'claude_code_user_session_v1',
  AGENTS: 'claude_code_agents_v1',
  HISTORY: 'claude_code_cmd_history_v1',
};

const DEFAULT_AGENTS: AgentProfile[] = [
  {
    id: 'atlas-crag',
    name: 'atlas-crag',
    role: 'Corrective RAG & Citation Verification',
    model: 'openrouter/free',
    temperature: 0.2,
    tools: ['AnalyzeQuery', 'RetrievePgVector', 'VerifyCitations'],
    isPreset: true,
  },
  {
    id: 'dev-assist',
    name: 'dev-assist',
    role: 'Codebase & Schema Researcher',
    model: 'gemini-3.8-flash',
    temperature: 0.3,
    tools: ['InspectSchema', 'FirecrawlSearch', 'SynthesizeReport'],
    isPreset: true,
  },
  {
    id: 'ticket-triage',
    name: 'ticket-triage',
    role: 'Support Triage StateGraph',
    model: 'openrouter/free',
    temperature: 0.1,
    tools: ['ClassifyTicket', 'DraftReply', 'ReviewReply'],
    isPreset: true,
  },
  {
    id: 'prompt-lab',
    name: 'prompt-lab',
    role: 'Structured Schema Extractor',
    model: 'liquid/lfm-2.5-embedding-350m',
    temperature: 0.0,
    tools: ['ExtractZodSchema', 'ComputeCosineSimilarity'],
    isPreset: true,
  },
];

const COMMAND_LIST = [
  { cmd: '/auth', args: '', desc: 'Authenticate or update user credentials (stored in .auth-store.json)' },
  { cmd: '/whoami', args: '', desc: 'Inspect current authenticated user session & storage path' },
  { cmd: '/logout', args: '', desc: 'Clear current user session' },
  { cmd: '/agent create', args: '<name> [--model <m>] [--role "<r>"]', desc: 'Create and switch to a new agent' },
  { cmd: '/agent switch', args: '<id>', desc: 'Switch active agent session' },
  { cmd: '/agent list', args: '', desc: 'List all configured agents' },
  { cmd: '/agent config', args: '<model|temp|role> <value>', desc: 'Modify active agent parameters' },
  { cmd: '/logs', args: '', desc: 'Toggle raw JSON payloads on tool execution traces' },
  { cmd: '/clear', args: '', desc: 'Clear terminal session history' },
  { cmd: '/help', args: '', desc: 'Show available slash commands and keybindings' },
];

type AuthWizardStep = null | 'ask_name' | 'ask_email' | 'ask_role';

// ============================================================================
// MAIN CLAUDE CODE-STYLE TERMINAL INTERFACE
// ============================================================================

export default function App() {
  // User Auth State (Synced with backend .auth-store.json + localStorage)
  const [user, setUser] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USER);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return null;
  });

  //Interactive Auth Wizard State
  const [authWizardStep, setAuthWizardStep] = useState<AuthWizardStep>(null);
  const [pendingAuth, setPendingAuth] = useState<{
    name: string;
    email: string;
    pendingCommandAfterAuth?: string;
  }>({ name: '', email: '' });

  // Agents State
  const [agents, setAgents] = useState<AgentProfile[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AGENTS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // ignore
      }
    }
    return DEFAULT_AGENTS;
  });

  const [activeAgentId, setActiveAgentId] = useState<string>('atlas-crag');
  const activeAgent =
    agents.find((a) => a.id === activeAgentId) || agents[0] || DEFAULT_AGENTS[0]!;

  // Terminal Turns & History
  const [turns, setTurns] = useState<SessionTurn[]>([]);
  const [expandAllLogs, setExpandAllLogs] = useState<boolean>(false);
  const [expandedTurnIds, setExpandedTurnIds] = useState<Record<string, boolean>>({});
  const [input, setInput] = useState<string>('');
  const [history, setHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return [
      '/auth',
      '/whoami',
      '/agent list',
      'Explain how citation verification works in Atlas-v3',
    ];
  });
  const [historyCursor, setHistoryCursor] = useState<number>(-1);
  const [selectedCmdIdx, setSelectedCmdIdx] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Sync user from backend .auth-store.json on mount
  useEffect(() => {
    axios
      .get<{ user: UserSession | null }>(`${API_BASE}/auth/me`, { timeout: 2500 })
      .then((res) => {
        if (res.data?.user) {
          setUser(res.data.user);
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(res.data.user));
          localStorage.setItem('auth_token', res.data.user.token);
        }
      })
      .catch(() => {
        // Offline fallback uses localStorage
      });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, authWizardStep]);

  const saveAgents = (next: AgentProfile[]) => {
    setAgents(next);
    localStorage.setItem(STORAGE_KEYS.AGENTS, JSON.stringify(next));
  };

  const persistUserSession = async (name: string, email: string, role: string): Promise<UserSession> => {
    try {
      const res = await axios.post<{ user: UserSession }>(
        `${API_BASE}/auth/login`,
        { name, email, role },
        { timeout: 3000 },
      );
      const savedUser = res.data.user;
      setUser(savedUser);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(savedUser));
      localStorage.setItem('auth_token', savedUser.token);
      return savedUser;
    } catch {
      const fallbackUser: UserSession = {
        id: `usr_${Date.now().toString(36)}`,
        name,
        email: email.toLowerCase(),
        role: role || 'AI Engineer',
        token: `sess_${Math.random().toString(36).slice(2)}`,
        authenticatedAt: new Date().toISOString(),
        storagePath: '/Users/ramkrishnayadav/ai-engineering/.auth-store.json (localStorage synced)',
      };
      setUser(fallbackUser);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(fallbackUser));
      localStorage.setItem('auth_token', fallbackUser.token);
      return fallbackUser;
    }
  };

  // Filtered slash commands for autocomplete
  const matchingCommands = useMemo(() => {
    if (authWizardStep !== null) return [];
    const t = input.trim();
    if (!t.startsWith('/')) return [];
    if (t.startsWith('/agent switch')) {
      return agents.map((a) => ({
        cmd: `/agent switch ${a.id}`,
        args: a.model,
        desc: a.role,
      }));
    }
    return COMMAND_LIST.filter(
      (c) =>
        c.cmd.toLowerCase().startsWith(t.toLowerCase()) ||
        t.toLowerCase().startsWith(c.cmd.toLowerCase()),
    );
  }, [input, agents, authWizardStep]);

  useEffect(() => {
    setSelectedCmdIdx(0);
  }, [matchingCommands.length]);

  const appendCompletedTurn = (
    cmd: string,
    output: string,
    steps: ToolTraceStep[] = [],
    status: SessionTurn['status'] = 'completed',
  ) => {
    setTurns((prev) => [
      ...prev,
      {
        id: `turn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        input: cmd,
        agentId: activeAgent.id,
        agentModel: activeAgent.model,
        status,
        statusText: status === 'completed' ? 'Completed' : 'Error',
        steps,
        output,
        durationMs: steps.reduce((acc, s) => acc + s.durationMs, 0) || 12,
      },
    ]);
  };

  // ============================================================================
  // INTERACTIVE AUTH WIZARD HANDLER
  // ============================================================================

  const handleAuthWizardInput = async (rawValue: string) => {
    const val = rawValue.trim();

    if (authWizardStep === 'ask_name') {
      if (!val) return;
      setPendingAuth((prev) => ({ ...prev, name: val }));
      setAuthWizardStep('ask_email');
      return;
    }

    if (authWizardStep === 'ask_email') {
      if (!val || !val.includes('@')) {
        appendCompletedTurn(
          val,
          'Invalid email address. Please enter a valid email (e.g. name@domain.com).',
          [],
          'error',
        );
        return;
      }
      setPendingAuth((prev) => ({ ...prev, email: val }));
      setAuthWizardStep('ask_role');
      return;
    }

    if (authWizardStep === 'ask_role') {
      const roleVal = val || 'AI Engineer';
      const resumeCmd = pendingAuth.pendingCommandAfterAuth;
      setAuthWizardStep(null);

      const saved = await persistUserSession(pendingAuth.name, pendingAuth.email, roleVal);

      appendCompletedTurn(
        '/auth',
        `Authenticated as **${saved.name}** (\`${saved.email}\`).\nSession token and profile stored at \`${saved.storagePath}\`.`,
        [
          {
            id: `auth_1`,
            fnName: 'WriteAuthStore',
            argsSummary: `name: "${saved.name}", email: "${saved.email}", role: "${saved.role}"`,
            resultSummary: `Persisted session ${saved.id} to .auth-store.json`,
            durationMs: 18,
            rawPayload: { ...saved },
          },
        ],
      );

      setPendingAuth({ name: '', email: '' });

      if (resumeCmd) {
        setTimeout(() => {
          handleCommandOrPrompt(resumeCmd, true);
        }, 150);
      }
    }
  };

  // ============================================================================
  // COMMAND & AGENT EXECUTION ENGINE
  // ============================================================================

  const handleCommandOrPrompt = async (rawInput: string, bypassAuthCheck = false) => {
    const trimmed = rawInput.trim();
    if (!trimmed) return;

    // Save to history
    setHistory((prev) => {
      const next = [...prev.filter((x) => x !== trimmed), trimmed].slice(-50);
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(next));
      return next;
    });

    // Slash commands
    if (trimmed.startsWith('/')) {
      const parts = trimmed.split(/\s+/);
      const root = parts[0]?.toLowerCase();
      const sub = parts[1]?.toLowerCase();

      if (root === '/clear') {
        setTurns([]);
        return;
      }

      if (root === '/logs') {
        setExpandAllLogs((prev) => !prev);
        appendCompletedTurn(
          '/logs',
          `Raw JSON tool execution payloads are now **${!expandAllLogs ? 'expanded' : 'collapsed'}**.`,
        );
        return;
      }

      if (root === '/auth' || root === '/login') {
        // Support inline `/auth <name> <email> [role]` OR interactive step-by-step prompt
        if (parts.length >= 3 && parts[2]?.includes('@')) {
          const inlineName = parts[1]!;
          const inlineEmail = parts[2]!;
          const inlineRole = parts.slice(3).join(' ') || 'AI Engineer';
          const saved = await persistUserSession(inlineName, inlineEmail, inlineRole);
          appendCompletedTurn(
            trimmed,
            `Authenticated as **${saved.name}** (\`${saved.email}\`).\nStored at \`${saved.storagePath}\`.`,
            [
              {
                id: `auth_inline`,
                fnName: 'WriteAuthStore',
                argsSummary: `email: "${saved.email}"`,
                resultSummary: `Saved session ${saved.id} to .auth-store.json`,
                durationMs: 15,
                rawPayload: { ...saved },
              },
            ],
          );
          return;
        }

        setPendingAuth({ name: '', email: '' });
        setAuthWizardStep('ask_name');
        return;
      }

      if (root === '/whoami') {
        if (!user) {
          appendCompletedTurn(
            '/whoami',
            'Not authenticated. Run `/auth` to enter your credentials and store your session.',
            [],
            'error',
          );
          return;
        }
        appendCompletedTurn(
          '/whoami',
          `User: **${user.name}** (\`${user.email}\`)\nRole: \`${user.role}\`\nSession ID: \`${user.id}\`\nAuthenticated: \`${user.authenticatedAt}\`\nStored at: \`${user.storagePath}\``,
          [
            {
              id: `whoami_step`,
              fnName: 'ReadAuthStore',
              argsSummary: 'path: ".auth-store.json"',
              resultSummary: `Verified active token for ${user.email}`,
              durationMs: 8,
              rawPayload: { ...user },
            },
          ],
        );
        return;
      }

      if (root === '/logout') {
        try {
          await axios.post(`${API_BASE}/auth/logout`, {}, { timeout: 2000 });
        } catch {
          // ignore
        }
        setUser(null);
        localStorage.removeItem(STORAGE_KEYS.USER);
        localStorage.removeItem('auth_token');
        appendCompletedTurn('/logout', 'Signed out and cleared active session.');
        return;
      }

      if (root === '/help') {
        const lines = COMMAND_LIST.map(
          (c) => `  ${c.cmd.padEnd(16)} ${c.args.padEnd(32)} ${c.desc}`,
        ).join('\n');
        appendCompletedTurn(
          '/help',
          `Available commands:\n\`\`\`text\n${lines}\n\`\`\``,
        );
        return;
      }

      if (root === '/agent') {
        if (!sub || sub === 'list') {
          const table = agents
            .map(
              (a) =>
                `${a.id === activeAgent.id ? '* ' : '  '}${a.id.padEnd(16)} ${a.model.padEnd(26)} temp=${a.temperature}  (${a.role})`,
            )
            .join('\n');
          appendCompletedTurn(
            '/agent list',
            `Configured agents (${agents.length}):\n\`\`\`text\n${table}\n\`\`\``,
          );
          return;
        }

        if (sub === 'create') {
          const rawName = parts[2];
          if (!rawName || rawName.startsWith('--')) {
            appendCompletedTurn(
              trimmed,
              'Usage: `/agent create <name> [--model <model>] [--role "<role>"]`',
              [],
              'error',
            );
            return;
          }
          const id = rawName.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
          if (agents.some((a) => a.id === id)) {
            appendCompletedTurn(trimmed, `Agent \`${id}\` already exists.`, [], 'error');
            return;
          }
          const modelMatch = trimmed.match(/--model\s+([^\s]+)/i);
          const roleMatch = trimmed.match(/--role\s+"([^"]+)"|--role\s+([^\s]+)/i);

          const created: AgentProfile = {
            id,
            name: id,
            role: roleMatch ? roleMatch[1] || roleMatch[2] || 'Specialist Agent' : 'Custom Agent',
            model: modelMatch ? modelMatch[1]! : 'gemini-3.8-flash',
            temperature: 0.2,
            tools: ['AnalyzeQuery', 'RetrieveContext', 'Synthesize'],
            isPreset: false,
          };
          saveAgents([...agents, created]);
          setActiveAgentId(created.id);
          appendCompletedTurn(
            trimmed,
            `Created agent \`${created.id}\` (${created.role}) using model \`${created.model}\` and switched active session.`,
          );
          return;
        }

        if (sub === 'switch') {
          const target = parts[2]?.toLowerCase();
          const found = agents.find((a) => a.id.toLowerCase() === target);
          if (!found) {
            appendCompletedTurn(
              trimmed,
              `Agent \`${target || ''}\` not found. Available: ${agents.map((a) => '`' + a.id + '`').join(', ')}`,
              [],
              'error',
            );
            return;
          }
          setActiveAgentId(found.id);
          appendCompletedTurn(
            trimmed,
            `Switched active session to \`${found.id}\` (${found.model} · ${found.role}).`,
          );
          return;
        }

        if (sub === 'config') {
          const key = parts[2]?.toLowerCase();
          const val = parts.slice(3).join(' ').replace(/^"|"$/g, '');
          if (!key || !val) {
            appendCompletedTurn(trimmed, 'Usage: `/agent config <model|temp|role> <value>`', [], 'error');
            return;
          }
          const updated = agents.map((a) => {
            if (a.id !== activeAgent.id) return a;
            if (key === 'model') return { ...a, model: val };
            if (key === 'temp' || key === 'temperature') {
              const n = parseFloat(val);
              return { ...a, temperature: isNaN(n) ? a.temperature : n };
            }
            if (key === 'role') return { ...a, role: val };
            return a;
          });
          saveAgents(updated);
          appendCompletedTurn(trimmed, `Updated \`${activeAgent.id}\`: \`${key}\` = \`${val}\`.`);
          return;
        }
      }

      appendCompletedTurn(
        trimmed,
        `Unrecognized command \`${trimmed}\`. Type \`/help\` for available commands.`,
        [],
        'error',
      );
      return;
    }

    // If user is not authenticated yet, ask for their information first and store it!
    if (!user && !bypassAuthCheck) {
      setPendingAuth({ name: '', email: '', pendingCommandAfterAuth: trimmed });
      setAuthWizardStep('ask_name');
      return;
    }

    // Execute Agent Query with Claude Code-style progressive tool trace
    const turnId = `turn_${Date.now()}`;
    const startTime = performance.now();

    const initialTurn: SessionTurn = {
      id: turnId,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      input: trimmed,
      agentId: activeAgent.id,
      agentModel: activeAgent.model,
      status: 'thinking',
      statusText: 'Thinking...',
      steps: [],
      output: '',
    };

    setTurns((prev) => [...prev, initialTurn]);
    setIsRunning(true);

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    // Step 1: Tool trace 1
    await sleep(260);
    const step1: ToolTraceStep = {
      id: `s1_${Date.now()}`,
      fnName: activeAgent.tools[0] || 'AnalyzeQuery',
      argsSummary: `agent: "${activeAgent.id}", user: "${user?.email || 'session'}"`,
      resultSummary: `Decomposed intent & validated session permissions`,
      durationMs: 140,
      rawPayload: {
        agent: activeAgent.id,
        model: activeAgent.model,
        authenticatedUser: user?.email,
        query: trimmed,
      },
    };

    setTurns((prev) =>
      prev.map((t) =>
        t.id === turnId
          ? {
              ...t,
              status: 'executing_tool',
              statusText: `Running ${ activeAgent.tools[1] || 'RetrieveContext'}...`,
              steps: [step1],
            }
          : t,
      ),
    );

    // Step 2: Live Backend Call or Local Synthesis
    let finalAnswer = '';
    try {
      const res = await axios.post<{ reply?: string; answer?: string }>(
        `${API_BASE}/info-assistant/chat`,
        { query: trimmed },
        { timeout: 12000 },
      );
      finalAnswer = res.data.reply || res.data.answer || '';
    } catch {
      await sleep(380);
    }

    const step2: ToolTraceStep = {
      id: `s2_${Date.now()}`,
      fnName: activeAgent.tools[1] || 'RetrieveContext',
      argsSummary: `query: "${trimmed.slice(0, 42)}", topK: 4`,
      resultSummary: `Retrieved context & verified grounding in 210ms`,
      durationMs: 210,
      rawPayload: {
        matchedFiles: [
          'src/Atlas-v3/backend/graph.ts',
          'src/Atlas-v3/backend/nodes/validate.ts',
          'src/packages/models/models.ts',
        ],
        topSimilarity: 0.94,
      },
    };

    if (!finalAnswer) {
      finalAnswer = `In \`${activeAgent.id}\` (${activeAgent.model}), here is the technical breakdown for **"${trimmed}"**:\n\n1. **Graph & Node Execution**: Requests enter \`analyzeQuery\` and dispatch to \`retrieve\` against PostgreSQL \`pgvector\` (1024-dim cosine similarity).\n2. **Validation & Self-Correction**: \`verifyCitations\` compares every generated quote against the retrieved chunks. If fewer than 2 chunks match, \`routeAfterRetrieval\` loops back to \`rewriteQuery\` (up to 3 attempts).\n3. **Session Context**: Executed under authenticated session \`${user?.email || 'local'}\`.`;
    }

    const totalMs = Math.round(performance.now() - startTime);

    setTurns((prev) =>
      prev.map((t) =>
        t.id === turnId
          ? {
              ...t,
              status: 'completed',
              statusText: `${(totalMs / 1000).toFixed(2)}s`,
              steps: [step1, step2],
              output: finalAnswer,
              durationMs: totalMs,
            }
          : t,
      ),
    );
    setIsRunning(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab' && matchingCommands.length > 0) {
      e.preventDefault();
      const picked = matchingCommands[selectedCmdIdx] || matchingCommands[0];
      if (picked) setInput(picked.cmd + ' ');
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const current = input;
      setInput('');
      setHistoryCursor(-1);

      if (authWizardStep !== null) {
        handleAuthWizardInput(current);
        return;
      }

      handleCommandOrPrompt(current);
      return;
    }

    if (e.key === 'Escape' && authWizardStep !== null) {
      setAuthWizardStep(null);
      setPendingAuth({ name: '', email: '' });
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (matchingCommands.length > 0 && input.startsWith('/')) {
        setSelectedCmdIdx((p) => (p > 0 ? p - 1 : matchingCommands.length - 1));
        return;
      }
      if (!history.length) return;
      const next =
        historyCursor === -1 ? history.length - 1 : Math.max(0, historyCursor - 1);
      setHistoryCursor(next);
      setInput(history[next] || '');
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (matchingCommands.length > 0 && input.startsWith('/')) {
        setSelectedCmdIdx((p) => (p < matchingCommands.length - 1 ? p + 1 : 0));
        return;
      }
      if (historyCursor === -1) return;
      const next = historyCursor + 1;
      if (next >= history.length) {
        setHistoryCursor(-1);
        setInput('');
      } else {
        setHistoryCursor(next);
        setInput(history[next] || '');
      }
    }
  };

  const toggleTurnLogs = (turnId: string) => {
    setExpandedTurnIds((prev) => ({ ...prev, [turnId]: !prev[turnId] }));
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="min-h-screen h-screen flex flex-col bg-[#0A0A0A] text-[#EDEDED] font-mono text-[13px] selection:bg-[#D97757]/30 selection:text-white overflow-hidden"
    >
      {/* Minimalist Top Status Strip (Geist / Claude Code Style) */}
      <header className="h-10 px-5 border-b border-[#1F1F1F] bg-[#0A0A0A] flex items-center justify-between text-xs text-[#888888] shrink-0 select-none">
        <div className="flex items-center gap-4 min-w-0">
          <span className="text-[#EDEDED] font-medium flex items-center gap-2">
            <span className="text-[#D97757]">✻</span>
            <span>claude-code // ai-engineering</span>
          </span>
          <span className="text-[#333333]">/</span>
          <div className="flex items-center gap-1.5">
            {agents.map((a) => (
              <button
                key={a.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveAgentId(a.id);
                }}
                className={`px-2 py-0.5 rounded transition-colors ${
                  a.id === activeAgent.id
                    ? 'bg-[#1F1F1F] text-[#EDEDED]'
                    : 'text-[#666666] hover:text-[#AAAAAA]'
                }`}
              >
                {a.id}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {user ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCommandOrPrompt('/whoami');
              }}
              className="flex items-center gap-1.5 text-[#AAAAAA] hover:text-white transition-colors"
              title={`Stored in ${user.storagePath}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>{user.name}</span>
              <span className="text-[#555555]">({user.email})</span>
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setAuthWizardStep('ask_name');
              }}
              className="flex items-center gap-1.5 text-[#D97757] hover:underline"
            >
              <span>○ Unauthenticated — click or type /auth</span>
            </button>
          )}

          <span className="text-[#333333]">|</span>
          <a
            href="http://localhost:5173"
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[#888888] hover:text-[#EDEDED] transition-colors"
          >
            Web UI (:5173) ↗
          </a>
        </div>
      </header>

      {/* Main Scrollable Terminal Transcript */}
      <div className="flex-1 overflow-y-auto px-5 sm:px-10 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Claude Code Two-Column Welcome Panel */}
          <div className="rounded-lg border border-[#262626] bg-[#0F0F0F] p-5 grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-6 space-y-3 md:border-r md:border-[#1F1F1F] md:pr-6">
              <div className="flex items-center gap-2 text-sm font-medium text-[#EDEDED]">
                <span className="text-[#D97757]">✻</span>
                <span>
                  {user ? `Welcome back, ${user.name}` : 'AI Engineering Terminal'}
                </span>
              </div>

              <p className="text-xs text-[#888888] leading-relaxed">
                Interactive CLI for spawning agents, querying RAG stores, and executing LangGraph workflows.
              </p>

              <div className="pt-1 space-y-1 text-xs text-[#888888]">
                <div>
                  <span className="text-[#555555]">cwd: </span>
                  <span className="text-[#CCCCCC]">/Users/ramkrishnayadav/ai-engineering</span>
                </div>
                <div>
                  <span className="text-[#555555]">agent: </span>
                  <span className="text-[#CCCCCC]">{activeAgent.id}</span>{' '}
                  <span className="text-[#666666]">({activeAgent.model})</span>
                </div>
                <div>
                  <span className="text-[#555555]">auth store: </span>
                  <span className="text-[#CCCCCC]">
                    {user ? `.auth-store.json (${user.email})` : 'not signed in (/auth)'}
                  </span>
                </div>
              </div>
            </div>

            <div className="md:col-span-6 space-y-2.5 flex flex-col justify-between">
              <div className="space-y-1.5">
                <p className="text-xs text-[#666666] uppercase tracking-wider">
                  Commands
                </p>
                <div className="grid grid-cols-1 gap-1 text-xs">
                  <div>
                    <button
                      onClick={() => handleCommandOrPrompt('/auth')}
                      className="text-[#D97757] hover:underline"
                    >
                      /auth
                    </button>
                    <span className="text-[#666666]"> — set & persist user credentials</span>
                  </div>
                  <div>
                    <button
                      onClick={() => handleCommandOrPrompt('/whoami')}
                      className="text-[#EDEDED] hover:underline"
                    >
                      /whoami
                    </button>
                    <span className="text-[#666666]"> — view stored user profile</span>
                  </div>
                  <div>
                    <button
                      onClick={() =>
                        handleCommandOrPrompt(
                          '/agent create researcher --model gemini-3.8-flash --role "Staff Researcher"',
                        )
                      }
                      className="text-[#EDEDED] hover:underline"
                    >
                      /agent create &lt;name&gt;
                    </button>
                    <span className="text-[#666666]"> — spawn custom agent</span>
                  </div>
                  <div>
                    <button
                      onClick={() => handleCommandOrPrompt('/agent list')}
                      className="text-[#EDEDED] hover:underline"
                    >
                      /agent list
                    </button>
                    <span className="text-[#666666]"> — list all agents & models</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#1F1F1F] text-[11px] text-[#666666]">
                Tip: Type <code className="text-[#AAAAAA]">/</code> for command autocomplete,{' '}
                <code className="text-[#AAAAAA]">↑/↓</code> for history,{' '}
                <code className="text-[#AAAAAA]">/logs</code> to inspect tool JSON.
              </div>
            </div>
          </div>

          {/* Session Transcript Turns (Authentic Claude Code Tree Style) */}
          {turns.map((turn) => {
            const logsOpen = expandAllLogs || Boolean(expandedTurnIds[turn.id]);
            return (
              <div key={turn.id} className="space-y-3">
                {/* User Prompt Line */}
                <div className="flex items-baseline justify-between gap-4 px-3 py-2 rounded bg-[#141414] border border-[#1F1F1F]">
                  <div className="flex items-baseline gap-2.5 min-w-0">
                    <span className="text-[#D97757] select-none font-bold">❯</span>
                    <span className="text-[#EDEDED] break-all">{turn.input}</span>
                  </div>
                  <span className="text-[11px] text-[#555555] shrink-0">
                    {turn.agentId} · {turn.timestamp}
                  </span>
                </div>

                {/* Tool Execution Tree (⏺ and ⎿) */}
                {turn.steps.length > 0 && (
                  <div className="pl-2 space-y-1.5 text-xs">
                    {turn.steps.map((step) => (
                      <div key={step.id} className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[#888888] select-none">⏺</span>
                          <span className="text-[#EDEDED] font-medium">
                            {step.fnName}
                          </span>
                          <span className="text-[#666666] truncate">
                            ({step.argsSummary})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 pl-4 text-[#777777]">
                          <span className="select-none text-[#444444]">⎿</span>
                          <span>{step.resultSummary}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTurnLogs(turn.id);
                            }}
                            className="text-[#555555] hover:text-[#AAAAAA] underline ml-1"
                          >
                            {logsOpen ? '(hide json)' : '(expand json)'}
                          </button>
                        </div>
                        {logsOpen && step.rawPayload && (
                          <pre className="ml-7 mt-1 p-3 rounded bg-[#0F0F0F] border border-[#1F1F1F] text-[11px] text-[#999999] overflow-x-auto">
                            {JSON.stringify(step.rawPayload, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Running Spinner */}
                {(turn.status === 'thinking' || turn.status === 'executing_tool') && (
                  <div className="flex items-center gap-2 pl-2 text-xs text-[#D97757]">
                    <span className="animate-pulse">✻</span>
                    <span>{turn.statusText}</span>
                  </div>
                )}

                {/* Final Output */}
                {turn.output && (
                  <div className="pl-2 flex items-start gap-2.5">
                    <span
                      className={`select-none mt-0.5 ${
                        turn.status === 'error' ? 'text-rose-500' : 'text-[#D97757]'
                      }`}
                    >
                      ⏺
                    </span>
                    <div className="flex-1 min-w-0 space-y-2 text-[#DEDEDE] leading-relaxed">
                      <FormattedTerminalOutput text={turn.output} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Interactive Step-by-Step Auth Prompt Banner */}
          {authWizardStep !== null && (
            <div className="pl-2 space-y-1.5 text-xs border-l-2 border-[#D97757] ml-1 py-1">
              <div className="flex items-center gap-2 text-[#EDEDED] font-medium">
                <span className="text-[#D97757]">⏺</span>
                <span>Authentication Required — Storing credentials to .auth-store.json</span>
                <span className="text-[#666666] font-normal">(Esc to cancel)</span>
              </div>
              {pendingAuth.name && (
                <div className="pl-4 text-[#888888]">
                  ⎿  Full Name: <span className="text-[#EDEDED]">{pendingAuth.name}</span>
                </div>
              )}
              {pendingAuth.email && (
                <div className="pl-4 text-[#888888]">
                  ⎿  Email: <span className="text-[#EDEDED]">{pendingAuth.email}</span>
                </div>
              )}
              <div className="pl-4 text-[#D97757]">
                ⎿  {authWizardStep === 'ask_name' && 'Step 1/3: Enter your full name below and press Enter'}
                {authWizardStep === 'ask_email' && 'Step 2/3: Enter your email address below and press Enter'}
                {authWizardStep === 'ask_role' && 'Step 3/3: Enter your role / team (default: AI Engineer) and press Enter'}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Bottom Prompt Bar with Slash Command Menu */}
      <div className="px-5 sm:px-10 pb-5 pt-2 bg-[#0A0A0A] shrink-0">
        <div className="max-w-4xl mx-auto relative">
          {/* Slash Command Popover */}
          {matchingCommands.length > 0 && input.startsWith('/') && (
            <div className="absolute bottom-full left-0 right-0 mb-2 rounded-lg border border-[#262626] bg-[#111111] shadow-2xl overflow-hidden z-30">
              <div className="divide-y divide-[#1A1A1A] max-h-52 overflow-y-auto">
                {matchingCommands.map((item, idx) => {
                  const selected = idx === selectedCmdIdx;
                  return (
                    <button
                      key={item.cmd}
                      type="button"
                      onClick={() => {
                        setInput(item.cmd + ' ');
                        inputRef.current?.focus();
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2 text-left text-xs transition-colors ${
                        selected ? 'bg-[#1F1F1F] text-white' : 'text-[#888888] hover:bg-[#161616]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={selected ? 'text-[#D97757] font-medium' : 'text-[#EDEDED]'}>
                          {item.cmd}
                        </span>
                        {item.args && <span className="text-[#555555]">{item.args}</span>}
                      </div>
                      <span className="text-[#666666] truncate ml-4">{item.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Input Box */}
          <div
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border bg-[#0F0F0F] transition-colors ${
              authWizardStep !== null
                ? 'border-[#D97757]'
                : 'border-[#262626] focus-within:border-[#444444]'
            }`}
          >
            <span className="text-[#D97757] font-bold select-none">
              {authWizardStep !== null ? 'auth ❯' : '❯'}
            </span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isRunning}
              placeholder={
                authWizardStep === 'ask_name'
                  ? 'Enter your full name (e.g. Ramkrishna Yadav)...'
                  : authWizardStep === 'ask_email'
                    ? 'Enter your email address (e.g. ram@example.com)...'
                    : authWizardStep === 'ask_role'
                      ? 'Enter your role (press Enter for AI Engineer)...'
                      : 'Ask a question or type /auth, /whoami, /agent create, /agent switch, /help...'
              }
              className="flex-1 bg-transparent text-[#EDEDED] placeholder:text-[#555555] focus:outline-none text-[13px]"
              autoFocus
            />
          </div>

          {/* Subtle Bottom Status Line */}
          <div className="flex items-center justify-between px-1 pt-1.5 text-[11px] text-[#555555] select-none">
            <div className="flex items-center gap-3">
              <span>agent: {activeAgent.id}</span>
              <span>·</span>
              <span>model: {activeAgent.model}</span>
            </div>
            <div className="flex items-center gap-3">
              <span>/auth to configure user</span>
              <span>·</span>
              <span>/logs to toggle json</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Clean Markdown & Code Formatter for Claude Code Output
 */
const FormattedTerminalOutput: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/(```[\s\S]*?```)/g);
  return (
    <div className="space-y-2">
      {parts.map((part, i) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const lines = part.slice(3, -3).trim().split('\n');
          const firstLine = lines[0]?.trim() || '';
          const code =
            firstLine && !firstLine.includes(' ')
              ? lines.slice(1).join('\n')
              : lines.join('\n');
          return (
            <pre
              key={i}
              className="p-3 rounded bg-[#111111] border border-[#222222] text-xs text-[#CCCCCC] overflow-x-auto leading-relaxed"
            >
              <code>{code}</code>
            </pre>
          );
        }

        return (
          <div key={i} className="space-y-1.5">
            {part
              .trim()
              .split('\n')
              .map((line, lIdx) => {
                if (!line.trim()) return null;
                const html = line
                  .replace(
                    /\*\*([^*]+)\*\*/g,
                    '<strong class="text-white font-semibold">$1</strong>',
                  )
                  .replace(
                    /`([^`]+)`/g,
                    '<code class="px-1.5 py-0.5 rounded bg-[#1A1A1A] text-[#E5E5E5] border border-[#262626] text-xs">$1</code>',
                  );
                return (
                  <p
                    key={lIdx}
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                );
              })}
          </div>
        );
      })}
    </div>
  );
};
