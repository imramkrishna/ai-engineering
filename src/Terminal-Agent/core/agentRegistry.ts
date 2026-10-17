import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface ExecutionStep {
  id: string;
  timestamp: string;
  phase: 'node' | 'tool_call' | 'tool_result' | 'validation' | 'system';
  title: string;
  detail?: string;
  payload?: Record<string, unknown>;
  durationMs?: number;
}

export interface TerminalAgentConfig {
  id: string;
  name: string;
  role: string;
  model: string;
  temperature: number;
  systemPrompt: string;
  tools: string[];
  isPreset?: boolean;
}

export interface UserAuthRecord {
  name: string;
  email: string;
  role: string;
  organization: string;
  apiKeyHint?: string;
  authenticatedAt: string;
}

export interface SlashCommandDef {
  command: string;
  args: string;
  description: string;
}

export const SLASH_COMMANDS: SlashCommandDef[] = [
  {
    command: '/auth',
    args: '[--name <name>] [--email <email>] [--role <role>]',
    description: 'Authenticate or update user profile stored in .auth-store.json',
  },
  {
    command: '/whoami',
    args: '',
    description: 'Display current authenticated user session & storage path',
  },
  {
    command: '/logout',
    args: '',
    description: 'Clear persisted user authentication from .auth-store.json',
  },
  {
    command: '/agent create',
    args: '<name> [--model <id>] [--role "<title>"]',
    description: 'Spawn a new AI agent & switch active terminal session to it',
  },
  {
    command: '/agent switch',
    args: '<agent-id>',
    description: 'Switch active terminal session to an existing agent',
  },
  {
    command: '/agent list',
    args: '',
    description: 'List all spawned and preset agents',
  },
  {
    command: '/agent config',
    args: '<model|temp|role|prompt> <value>',
    description: 'Modify active agent model, temperature, role, or system prompt',
  },
  {
    command: '/agent delete',
    args: '<agent-id>',
    description: 'Remove a custom user-spawned agent',
  },
  {
    command: '/logs',
    args: '',
    description: 'Expand full JSON execution trace for the last run',
  },
  {
    command: '/clear',
    args: '',
    description: 'Clear terminal screen and redraw welcome card',
  },
  {
    command: '/help',
    args: '',
    description: 'Display CLI command reference & keyboard shortcuts',
  },
  {
    command: '/exit',
    args: '',
    description: 'Exit the Claude Code Terminal CLI',
  },
];

export const PRESET_AGENTS: TerminalAgentConfig[] = [
  {
    id: 'atlas-crag',
    name: 'Atlas-v3 CRAG',
    role: 'Corrective RAG & Citation Verifier',
    model: process.env.CHAT_MODEL || 'openrouter/free',
    temperature: 0.2,
    systemPrompt:
      'You are Atlas-v3, an enterprise Corrective RAG assistant. Provide concise, accurate, well-structured technical answers with clear citations and actionable examples.',
    tools: ['analyzeQuery', 'pgvector_retrieve', 'rewriteQuery', 'verifyCitations'],
    isPreset: true,
  },
  {
    id: 'dev-assist',
    name: 'DevAssist-v2',
    role: 'Autonomous Developer & DB Architect',
    model: process.env.GOOGLE_MODEL || 'gemini-3.8-flash',
    temperature: 0.3,
    systemPrompt:
      'You are DevAssist-v2, an expert full-stack AI engineering assistant specializing in TypeScript, LangChain, LangGraph, PostgreSQL pgvector, and system architecture.',
    tools: ['firecrawl_search', 'inspect_db_schema', 'duplicate_call_guard'],
    isPreset: true,
  },
  {
    id: 'ticket-triage',
    name: 'Ticket-Triage',
    role: 'Support Classifier & Reply Drafter',
    model: process.env.CHAT_MODEL || 'openrouter/free',
    temperature: 0.1,
    systemPrompt:
      'You are a customer support triage agent. Classify incoming issues into (bug, billing, question), draft a polite response, and include verification notes.',
    tools: ['classifyTicket', 'draftReply', 'reviewReply'],
    isPreset: true,
  },
];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REGISTRY_FILE = path.join(__dirname, '..', '.agents-state.json');
export const AUTH_STORE_FILE = path.resolve(__dirname, '..', '..', '..', '.auth-store.json');

export class AgentRegistry {
  private agents: TerminalAgentConfig[] = [];
  private activeId: string = 'atlas-crag';
  private lastExecutionSteps: ExecutionStep[] = [];

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(REGISTRY_FILE)) {
        const raw = fs.readFileSync(REGISTRY_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.agents) && parsed.agents.length > 0) {
          this.agents = parsed.agents;
          this.activeId = parsed.activeId || this.agents[0]!.id;
          return;
        }
      }
    } catch {
      // Fallback to presets
    }
    this.agents = [...PRESET_AGENTS];
    this.activeId = this.agents[0]!.id;
  }

  private save(): void {
    try {
      fs.writeFileSync(
        REGISTRY_FILE,
        JSON.stringify({ agents: this.agents, activeId: this.activeId }, null, 2),
        'utf-8',
      );
    } catch {
      // ignore disk write errors
    }
  }

  public getAuthUser(): UserAuthRecord | null {
    try {
      if (fs.existsSync(AUTH_STORE_FILE)) {
        const raw = fs.readFileSync(AUTH_STORE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && parsed.email) {
          return parsed as UserAuthRecord;
        }
      }
    } catch {
      // ignore read errors
    }
    return null;
  }

  public saveAuthUser(user: UserAuthRecord): void {
    try {
      fs.writeFileSync(AUTH_STORE_FILE, JSON.stringify(user, null, 2), 'utf-8');
    } catch {
      // ignore write errors
    }
  }

  public clearAuthUser(): void {
    try {
      if (fs.existsSync(AUTH_STORE_FILE)) {
        fs.unlinkSync(AUTH_STORE_FILE);
      }
    } catch {
      // ignore unlink errors
    }
  }

  public getAll(): TerminalAgentConfig[] {
    return this.agents;
  }

  public getActive(): TerminalAgentConfig {
    return (
      this.agents.find((a) => a.id === this.activeId) ||
      this.agents[0] ||
      PRESET_AGENTS[0]!
    );
  }

  public switchAgent(idOrName: string): TerminalAgentConfig | null {
    const target = idOrName.trim().toLowerCase();
    const found = this.agents.find(
      (a) => a.id.toLowerCase() === target || a.name.toLowerCase() === target,
    );
    if (!found) return null;
    this.activeId = found.id;
    this.save();
    return found;
  }

  public createAgent(
    rawName: string,
    options?: { model?: string; role?: string },
  ): { agent?: TerminalAgentConfig; error?: string } {
    const id = rawName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-');
    if (!id) {
      return { error: 'Agent name cannot be empty.' };
    }
    if (this.agents.some((a) => a.id === id)) {
      return { error: `Agent "${id}" already exists. Use /agent switch ${id}` };
    }

    const role = options?.role || 'Custom Specialist Agent';
    const model = options?.model || (process.env.CHAT_MODEL ?? 'openrouter/free');

    const newAgent: TerminalAgentConfig = {
      id,
      name: rawName.trim(),
      role,
      model,
      temperature: 0.3,
      systemPrompt: `You are ${rawName.trim()}, acting as ${role}. Provide clear, accurate, and concise responses.`,
      tools: ['analyzeQuery', 'web_search', 'code_analysis'],
      isPreset: false,
    };

    this.agents.push(newAgent);
    this.activeId = newAgent.id;
    this.save();
    return { agent: newAgent };
  }

  public updateActiveConfig(
    key: string,
    value: string,
  ): { updated?: TerminalAgentConfig; error?: string } {
    const active = this.getActive();
    const k = key.toLowerCase();

    if (k === 'model') {
      active.model = value;
    } else if (k === 'temp' || k === 'temperature') {
      const num = parseFloat(value);
      if (isNaN(num) || num < 0 || num > 2) {
        return { error: 'Temperature must be a number between 0.0 and 2.0' };
      }
      active.temperature = num;
    } else if (k === 'role') {
      active.role = value;
    } else if (k === 'prompt') {
      active.systemPrompt = value;
    } else {
      return {
        error: `Unknown config key "${key}". Valid keys: model, temp, role, prompt`,
      };
    }

    this.save();
    return { updated: active };
  }

  public deleteAgent(id: string): { deleted?: TerminalAgentConfig; error?: string } {
    const target = this.agents.find((a) => a.id.toLowerCase() === id.toLowerCase());
    if (!target) {
      return { error: `Agent "${id}" not found.` };
    }
    if (target.isPreset) {
      return { error: `Cannot delete built-in preset agent "${target.id}".` };
    }
    this.agents = this.agents.filter((a) => a.id !== target.id);
    if (this.activeId === target.id) {
      this.activeId = this.agents[0]!.id;
    }
    this.save();
    return { deleted: target };
  }

  public setLastSteps(steps: ExecutionStep[]): void {
    this.lastExecutionSteps = steps;
  }

  public getLastSteps(): ExecutionStep[] {
    return this.lastExecutionSteps;
  }
}
