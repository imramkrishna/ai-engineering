import { useCallback, useRef, useState } from 'react';
import apiService, { emitGlobalToast } from '../services/api';
import {
  BACKEND_PROFILES,
  type BackendProfileId,
} from '../config/endpoints.config';
import {
  type AgentConfig,
  DEFAULT_AGENTS,
  type ExecutionStatus,
  type ExecutionStepLog,
  simulateAgentExecutionStream,
} from '../services/agentSimulator';

export interface TerminalBlock {
  id: string;
  timestamp: string;
  command: string;
  isSlashCommand: boolean;
  agentId: string;
  agentName: string;
  agentModel: string;
  backendProfile: BackendProfileId;
  status: ExecutionStatus;
  statusLabel: string;
  durationMs?: number;
  steps: ExecutionStepLog[];
  output: string;
  sources?: Array<{
    documentName: string;
    chunkId: string;
    similarity: number;
    quote: string;
  }>;
  isFallback?: boolean;
}

export interface CommandSuggestion {
  command: string;
  argsHint: string;
  description: string;
  category: 'agent' | 'backend' | 'system';
}

export const SLASH_COMMAND_SUGGESTIONS: CommandSuggestion[] = [
  {
    command: '/agent create',
    argsHint: '<name> [--model <id>] [--role <title>]',
    description: 'Spawn a new AI agent instance and switch session to it',
    category: 'agent',
  },
  {
    command: '/agent switch',
    argsHint: '<agent-id>',
    description: 'Switch active terminal session to an existing agent',
    category: 'agent',
  },
  {
    command: '/agent list',
    argsHint: '',
    description: 'List all spawned and preset agents with model & profile configs',
    category: 'agent',
  },
  {
    command: '/agent config',
    argsHint: '<model|temp|role|prompt> <value>',
    description: 'Dynamically update active agent parameters at runtime',
    category: 'agent',
  },
  {
    command: '/agent delete',
    argsHint: '<agent-id>',
    description: 'Terminate and remove a user-spawned agent',
    category: 'agent',
  },
  {
    command: '/backend switch',
    argsHint: '<atlas-v3|prompt-lab|info-assistant|dev-assist|custom>',
    description: 'Hot-swap centralized API service backend profile',
    category: 'backend',
  },
  {
    command: '/mode',
    argsHint: '<auto-fallback|live-only|simulate-only>',
    description: 'Configure API connection mode and offline simulator fallback',
    category: 'backend',
  },
  {
    command: '/clear',
    argsHint: '',
    description: 'Clear all terminal execution blocks from current view',
    category: 'system',
  },
  {
    command: '/help',
    argsHint: '',
    description: 'Display interactive Agent CLI command reference & shortcuts',
    category: 'system',
  },
];

const STORAGE_KEYS = {
  AGENTS: 'ai_eng_terminal_agents_v1',
  HISTORY: 'ai_eng_terminal_cmd_history_v1',
};

export function useTerminal() {
  const [agents, setAgents] = useState<AgentConfig[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEYS.AGENTS);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {
          // ignore
        }
      }
    }
    return DEFAULT_AGENTS;
  });

  const [activeAgentId, setActiveAgentId] = useState<string>(() => agents[0]?.id || 'atlas-crag');

  const [commandHistory, setCommandHistory] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEYS.HISTORY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore
        }
      }
    }
    return [
      '/help',
      '/agent list',
      'Explain how Atlas-v3 Corrective RAG validates citations in LangGraph',
      'Inspect the PostgreSQL pgvector schema for document_chunks',
      '/agent create security-auditor --model gemini-3.8-flash --role "Security Reviewer"',
    ];
  });

  const [blocks, setBlocks] = useState<TerminalBlock[]>(() => [
    {
      id: 'blk_welcome',
      timestamp: new Date().toLocaleTimeString(),
      command: '/system init --profile atlas-v3',
      isSlashCommand: true,
      agentId: 'atlas-crag',
      agentName: 'Atlas-v3 CRAG',
      agentModel: 'openrouter/free (Gemini-3.8-Flash Backup)',
      backendProfile: 'atlas-v3',
      status: 'completed',
      statusLabel: 'Ready (0.04s)',
      durationMs: 42,
      steps: [
        {
          id: 'init_1',
          timestamp: new Date().toLocaleTimeString(),
          phase: 'system',
          title: 'Centralized API Client Initialized',
          detail: `Active Profile: ${apiService.getActiveProfile().name} (${apiService.getActiveProfile().baseUrl})`,
          durationMs: 18,
        },
        {
          id: 'init_2',
          timestamp: new Date().toLocaleTimeString(),
          phase: 'system',
          title: 'Agent Registry Loaded',
          detail: '4 preset agents online (atlas-crag, dev-assist, ticket-triage, prompt-lab)',
          durationMs: 24,
        },
      ],
      output: `Welcome to **NexusOS Agent Terminal (v2.4)** — Enterprise AI Engineering CLI.
Type a natural language prompt to stream an agent run, or use slash commands:
- \`/agent create <name> [--model <id>] [--role <role>]\` — Spawn a new custom agent
- \`/agent switch <id>\` — Switch active agent (\`atlas-crag\`, \`dev-assist\`, \`ticket-triage\`, \`prompt-lab\`)
- \`/agent list\` — Inspect all available agents
- \`/backend switch <profile>\` — Switch centralized API config map at runtime
- \`/help\` — Show full command list`,
    },
  ]);

  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const activeAgent =
    agents.find((a) => a.id === activeAgentId) || agents[0] || DEFAULT_AGENTS[0];

  const saveAgents = useCallback((nextAgents: AgentConfig[]) => {
    setAgents(nextAgents);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.AGENTS, JSON.stringify(nextAgents));
    }
  }, []);

  const pushHistory = useCallback((cmd: string) => {
    setCommandHistory((prev) => {
      const filtered = prev.filter((item) => item !== cmd);
      const next = [...filtered, cmd].slice(-50);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const stopActiveStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
      emitGlobalToast('info', 'Execution Aborted', 'Active agent stream was cancelled by user.');
    }
  }, []);

  const clearTerminal = useCallback(() => {
    setBlocks([]);
  }, []);

  /**
   * Slash Command Execution Engine
   */
  const handleSlashCommand = useCallback(
    (rawCommand: string, blockId: string) => {
      const parts = rawCommand.trim().split(/\s+/);
      const rootCmd = parts[0]?.toLowerCase();
      const subCmd = parts[1]?.toLowerCase();

      const completeBlock = (output: string, status: ExecutionStatus = 'completed', steps: ExecutionStepLog[] = []) => {
        setBlocks((prev) =>
          prev.map((b) =>
            b.id === blockId
              ? {
                  ...b,
                  status,
                  statusLabel: status === 'completed' ? 'Completed' : 'Command Error',
                  durationMs: 15,
                  output,
                  steps,
                }
              : b,
          ),
        );
      };

      if (rootCmd === '/clear') {
        setBlocks([]);
        return;
      }

      if (rootCmd === '/help') {
        const helpText = `### Agent Terminal CLI Reference

| Command | Arguments | Description |
| :--- | :--- | :--- |
| \`/agent create\` | \`<name> [--model <m>] [--role <r>]\` | Spawn & activate a custom AI agent |
| \`/agent switch\` | \`<agent-id>\` | Switch terminal context to another agent |
| \`/agent list\` | *(none)* | View all registered agents & models |
| \`/agent config\` | \`<model\\|temp\\|role\\|prompt> <val>\` | Modify active agent configuration |
| \`/agent delete\` | \`<agent-id>\` | Delete a custom agent |
| \`/backend switch\` | \`<atlas-v3\\|prompt-lab\\|info-assistant\\|dev-assist\\|custom>\` | Rebind centralized API service profile |
| \`/mode\` | \`<auto-fallback\\|live-only\\|simulate-only>\` | Change API execution mode |
| \`/clear\` | *(none)* | Clear all terminal blocks |

**Keyboard Shortcuts:**
- \`Up / Down Arrows\`: Navigate command history or autocomplete menu
- \`Tab\`: Autocomplete highlighted slash command
- \`Ctrl + C\`: Abort active streaming execution`;
        completeBlock(helpText);
        return;
      }

      if (rootCmd === '/mode') {
        const targetMode = subCmd as 'auto-fallback' | 'live-only' | 'simulate-only';
        if (!['auto-fallback', 'live-only', 'simulate-only'].includes(targetMode)) {
          completeBlock(
            `Invalid mode \`${subCmd || ''}\`. Available modes: \`auto-fallback\`, \`live-only\`, \`simulate-only\`. Current mode: **${apiService.getConnectionMode()}**`,
            'error',
          );
          return;
        }
        apiService.setConnectionMode(targetMode);
        emitGlobalToast('success', 'Connection Mode Updated', `Now running in ${targetMode} mode.`);
        completeBlock(`Connection mode set to **\`${targetMode}\`**.`);
        return;
      }

      if (rootCmd === '/backend') {
        if (subCmd === 'switch') {
          const profileId = parts[2] as BackendProfileId;
          if (!profileId || !BACKEND_PROFILES[profileId]) {
            const validIds = Object.keys(BACKEND_PROFILES).join(', ');
            completeBlock(
              `Unknown backend profile \`${profileId || ''}\`. Valid profiles: \`${validIds}\``,
              'error',
            );
            return;
          }
          const updated = apiService.setBackendProfile(profileId);
          emitGlobalToast(
            'success',
            `Switched to ${updated.name}`,
            `Base URL: ${updated.baseUrl}`,
          );
          completeBlock(
            `Switched centralized API client to **${updated.name}** (\`${updated.baseUrl}\`).\nArchitecture: \`${updated.architecture}\``,
            'completed',
            [
              {
                id: `step_cfg_${Date.now()}`,
                timestamp: new Date().toLocaleTimeString(),
                phase: 'system',
                title: `apiService.setBackendProfile("${profileId}")`,
                detail: `Updated Axios baseURL to ${updated.baseUrl}`,
                durationMs: 4,
              },
            ],
          );
          return;
        }
      }

      if (rootCmd === '/agent') {
        if (!subCmd || subCmd === 'list') {
          const rows = agents
            .map(
              (a) =>
                `| ${a.id === activeAgent.id ? '**➔ ' + a.id + '**' : '`' + a.id + '`'} | ${a.name} | \`${a.model}\` | \`${a.backendProfile}\` | ${a.temperature} |`,
            )
            .join('\n');
          completeBlock(
            `### Registered AI Agents (${agents.length})\n\n| ID | Name | Model | Profile | Temp |\n| :--- | :--- | :--- | :--- | :--- |\n${rows}`,
          );
          return;
        }

        if (subCmd === 'create') {
          const rawName = parts[2];
          if (!rawName) {
            completeBlock(
              'Usage: `/agent create <name> [--model <model-id>] [--role <role-description>]`',
              'error',
            );
            return;
          }

          const modelMatch = rawCommand.match(/--model\s+([^\s]+)/i);
          const roleMatch = rawCommand.match(/--role\s+"([^"]+)"|--role\s+([^\s]+)/i);

          const id = rawName.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
          if (agents.some((a) => a.id === id)) {
            completeBlock(`Agent with ID \`${id}\` already exists. Use \`/agent switch ${id}\`.`, 'error');
            return;
          }

          const newAgent: AgentConfig = {
            id,
            name: rawName,
            role: roleMatch ? roleMatch[1] || roleMatch[2] || 'Custom Specialist Agent' : 'Custom Autonomous Agent',
            model: modelMatch ? modelMatch[1]! : 'google/gemini-3.8-flash',
            temperature: 0.3,
            backendProfile: apiService.getProfileId(),
            systemPrompt: `You are ${rawName}, a specialized AI engineering agent.`,
            tools: ['pgvector_retrieve', 'firecrawl_search', 'zod_structured_output'],
            createdAt: new Date().toISOString(),
            isPreset: false,
          };

          const updatedAgents = [...agents, newAgent];
          saveAgents(updatedAgents);
          setActiveAgentId(newAgent.id);
          emitGlobalToast('success', 'Agent Spawned', `Switched active session to ${newAgent.name} (${newAgent.id})`);

          completeBlock(
            `Spawned new agent **${newAgent.name}** (\`${newAgent.id}\`) and switched active session.\n- **Role**: ${newAgent.role}\n- **Model**: \`${newAgent.model}\`\n- **Backend Profile**: \`${newAgent.backendProfile}\``,
            'completed',
            [
              {
                id: `spawn_${Date.now()}`,
                timestamp: new Date().toLocaleTimeString(),
                phase: 'system',
                title: `Agent Registry: Spawned "${newAgent.id}"`,
                payload: { ...newAgent },
                durationMs: 12,
              },
            ],
          );
          return;
        }

        if (subCmd === 'switch') {
          const target = parts[2]?.toLowerCase();
          if (!target) {
            completeBlock(
              `Usage: \`/agent switch <id>\`. Available IDs: ${agents.map((a) => '`' + a.id + '`').join(', ')}`,
              'error',
            );
            return;
          }
          const found = agents.find(
            (a) => a.id.toLowerCase() === target || a.name.toLowerCase() === target,
          );
          if (!found) {
            completeBlock(
              `Agent \`${target}\` not found. Available: ${agents.map((a) => '`' + a.id + '`').join(', ')}`,
              'error',
            );
            return;
          }
          setActiveAgentId(found.id);
          apiService.setBackendProfile(found.backendProfile);
          emitGlobalToast('info', `Active Agent: ${found.name}`, `Profile synced to ${found.backendProfile}`);
          completeBlock(
            `Switched active terminal session to **${found.name}** (\`${found.id}\`).\n- **Role**: ${found.role}\n- **Model**: \`${found.model}\`\n- **Linked Backend**: \`${found.backendProfile}\``,
          );
          return;
        }

        if (subCmd === 'config') {
          const key = parts[2]?.toLowerCase();
          const val = parts.slice(3).join(' ').replace(/^"|"$/g, '');
          if (!key || !val) {
            completeBlock(
              'Usage: `/agent config <model|temp|role|prompt> <value>`',
              'error',
            );
            return;
          }

          const updatedAgents = agents.map((a) => {
            if (a.id !== activeAgent.id) return a;
            if (key === 'model') return { ...a, model: val };
            if (key === 'temp' || key === 'temperature') {
              const num = parseFloat(val);
              return { ...a, temperature: isNaN(num) ? a.temperature : Math.max(0, Math.min(2, num)) };
            }
            if (key === 'role') return { ...a, role: val };
            if (key === 'prompt') return { ...a, systemPrompt: val };
            return a;
          });

          saveAgents(updatedAgents);
          emitGlobalToast('success', 'Agent Reconfigured', `Updated ${key} on ${activeAgent.name}`);
          completeBlock(
            `Updated **${activeAgent.name}** configuration: \`${key}\` = \`${val}\`.`,
          );
          return;
        }

        if (subCmd === 'delete') {
          const targetId = parts[2]?.toLowerCase();
          const found = agents.find((a) => a.id.toLowerCase() === targetId);
          if (!found) {
            completeBlock(`Agent \`${targetId || ''}\` not found.`, 'error');
            return;
          }
          if (found.isPreset) {
            completeBlock(`Cannot delete built-in preset agent \`${found.id}\`.`, 'error');
            return;
          }
          const next = agents.filter((a) => a.id !== found.id);
          saveAgents(next);
          if (activeAgent.id === found.id) {
            setActiveAgentId(next[0]!.id);
          }
          emitGlobalToast('info', 'Agent Deleted', `Removed agent ${found.name}`);
          completeBlock(`Terminated and removed agent \`${found.id}\`.`);
          return;
        }
      }

      completeBlock(
        `Unrecognized slash command \`${rawCommand}\`. Type \`/help\` for a list of supported commands.`,
        'error',
      );
    },
    [activeAgent, agents, saveAgents],
  );

  /**
   * Executes either a Slash Command or an Agent Query (Live API with Seamless Simulator Fallback)
   */
  const executeCommand = useCallback(
    async (rawInput: string) => {
      const trimmed = rawInput.trim();
      if (!trimmed) return;

      pushHistory(trimmed);

      const isSlash = trimmed.startsWith('/');
      const blockId = `blk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const startTime = performance.now();

      const newBlock: TerminalBlock = {
        id: blockId,
        timestamp: new Date().toLocaleTimeString(),
        command: trimmed,
        isSlashCommand: isSlash,
        agentId: activeAgent.id,
        agentName: activeAgent.name,
        agentModel: activeAgent.model,
        backendProfile: apiService.getProfileId(),
        status: 'thinking',
        statusLabel: isSlash ? 'Executing CLI command...' : `[${activeAgent.name}] Initializing...`,
        steps: [],
        output: '',
      };

      setBlocks((prev) => [...prev, newBlock]);

      if (isSlash) {
        handleSlashCommand(trimmed, blockId);
        return;
      }

      // Natural language prompt -> Execute via API or Fallback Stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setIsStreaming(true);

      const mode = apiService.getConnectionMode();
      const profile = apiService.getActiveProfile();

      try {
        // Attempt real HTTP call if mode is not simulate-only
        if (mode !== 'simulate-only') {
          const startStep: ExecutionStepLog = {
            id: `http_${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            phase: 'tool_call',
            title: `HTTP POST ${profile.baseUrl}${profile.endpoints.chat}`,
            detail: `Dispatching payload via centralized Axios client (${profile.id})`,
            payload: { query: trimmed, agentId: activeAgent.id },
          };

          setBlocks((prev) =>
            prev.map((b) =>
              b.id === blockId
                ? {
                    ...b,
                    status: 'executing_tool',
                    statusLabel: `POST ${profile.baseUrl}${profile.endpoints.chat}...`,
                    steps: [...b.steps, startStep],
                  }
                : b,
            ),
          );

          const liveResponse = await apiService.post<{
            success?: boolean;
            data?: { message?: string; sources?: TerminalBlock['sources'] } | string;
            message?: string;
          }>(
            profile.endpoints.chat,
            { query: trimmed, msg: trimmed },
            {
              signal: controller.signal,
              _suppressGlobalErrorToast: mode === 'auto-fallback',
            },
          );

          const extractedText =
            typeof liveResponse?.data === 'string'
              ? liveResponse.data
              : liveResponse?.data?.message ||
                liveResponse?.message ||
                JSON.stringify(liveResponse, null, 2);

          const extractedSources =
            typeof liveResponse?.data === 'object' ? liveResponse?.data?.sources : undefined;

          const totalDuration = Math.round(performance.now() - startTime);

          setBlocks((prev) =>
            prev.map((b) =>
              b.id === blockId
                ? {
                    ...b,
                    status: 'completed',
                    statusLabel: `Completed (${(totalDuration / 1000).toFixed(2)}s)`,
                    durationMs: totalDuration,
                    output: extractedText,
                    sources: extractedSources,
                    isFallback: false,
                    steps: [
                      ...b.steps,
                      {
                        id: `http_ok_${Date.now()}`,
                        timestamp: new Date().toLocaleTimeString(),
                        phase: 'tool_result',
                        title: '200 OK — Live Backend Response Received',
                        detail: `Received response from ${profile.name} in ${totalDuration}ms`,
                        durationMs: totalDuration,
                      },
                    ],
                  }
                : b,
            ),
          );
          setIsStreaming(false);
          return;
        }
      } catch (liveErr) {
        if (controller.signal.aborted) {
          setIsStreaming(false);
          return;
        }

        // If user requires strict live-only mode, show error state
        if (mode === 'live-only') {
          const errMsg = (liveErr as { message?: string })?.message || 'Backend unreachable';
          setBlocks((prev) =>
            prev.map((b) =>
              b.id === blockId
                ? {
                    ...b,
                    status: 'error',
                    statusLabel: 'Connection Failed',
                    durationMs: Math.round(performance.now() - startTime),
                    output: `**Error connecting to ${profile.name}** (\`${profile.baseUrl}\`):\n> ${errMsg}\n\n*Tip: Start the backend server or run \`/mode auto-fallback\` to enable the interactive agent simulator.*`,
                  }
                : b,
            ),
          );
          setIsStreaming(false);
          return;
        }

        // Otherwise, log auto-fallback transition step and run streaming simulator
        const fallbackStep: ExecutionStepLog = {
          id: `fb_${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          phase: 'system',
          title: `Auto-Fallback Engaged (${profile.baseUrl} offline)`,
          detail: 'Switched to local LangGraph / ReAct streaming simulator engine',
          durationMs: 12,
        };

        setBlocks((prev) =>
          prev.map((b) =>
            b.id === blockId
              ? {
                  ...b,
                  isFallback: true,
                  steps: [...b.steps, fallbackStep],
                }
              : b,
          ),
        );
      }

      // Stream from the multi-step simulator
      try {
        for await (const event of simulateAgentExecutionStream(
          trimmed,
          activeAgent,
          controller.signal,
        )) {
          const elapsed = Math.round(performance.now() - startTime);
          setBlocks((prev) =>
            prev.map((b) => {
              if (b.id !== blockId) return b;
              return {
                ...b,
                isFallback: true,
                status: event.status,
                statusLabel:
                  event.status === 'completed'
                    ? `Completed (${(elapsed / 1000).toFixed(2)}s)`
                    : event.statusLabel,
                durationMs: elapsed,
                steps: event.stepLog ? [...b.steps, event.stepLog] : b.steps,
                output: event.tokenChunk ? b.output + event.tokenChunk : b.output,
                sources: event.sources || b.sources,
              };
            }),
          );
        }
      } finally {
        setIsStreaming(false);
      }
    },
    [activeAgent, handleSlashCommand, pushHistory],
  );

  const selectAgent = useCallback(
    (agentId: string) => {
      const found = agents.find((a) => a.id === agentId);
      if (found) {
        setActiveAgentId(found.id);
        apiService.setBackendProfile(found.backendProfile);
        emitGlobalToast(
          'info',
          `Switched to ${found.name}`,
          `Backend profile: ${found.backendProfile}`,
        );
      }
    },
    [agents],
  );

  return {
    agents,
    activeAgent,
    selectAgent,
    blocks,
    commandHistory,
    isStreaming,
    executeCommand,
    stopActiveStream,
    clearTerminal,
  };
}
