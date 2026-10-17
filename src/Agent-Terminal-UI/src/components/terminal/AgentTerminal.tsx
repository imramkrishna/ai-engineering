import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Terminal as TerminalIcon,
  ArrowUp,
  Square,
  Trash2,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Wrench,
  Copy,
  Check,
  Plus,
  Sparkles,
  Command,
} from 'lucide-react';
import {
  SLASH_COMMAND_SUGGESTIONS,
  type TerminalBlock,
  useTerminal,
} from '../../hooks/useTerminal';
import type { ExecutionStatus } from '../../services/agentSimulator';

interface AgentTerminalProps {
  terminalState: ReturnType<typeof useTerminal>;
  isStandalone?: boolean;
  onToggleStandalone?: () => void;
}

const StatusPill: React.FC<{ status: ExecutionStatus; label: string }> = ({
  status,
  label,
}) => {
  if (status === 'thinking') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-mono text-amber-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>{label}</span>
      </span>
    );
  }
  if (status === 'executing_tool') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-mono text-sky-400">
        <Wrench className="w-3.5 h-3.5 animate-pulse" />
        <span>{label}</span>
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-mono text-rose-400">
        <AlertCircle className="w-3.5 h-3.5" />
        <span>{label}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-500">
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
      <span>{label}</span>
    </span>
  );
};

const MarkdownContent: React.FC<{ content: string }> = ({ content }) => {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  if (!content) return null;
  const parts = content.split(/(```[\s\S]*?```)/g);

  const copyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1600);
  };

  return (
    <div className="space-y-3 text-[13px] leading-relaxed text-zinc-200">
      {parts.map((part, idx) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const lines = part.slice(3, -3).trim().split('\n');
          const lang = lines[0]?.trim() || 'code';
          const code = lines.slice(1).join('\n');
          return (
            <div
              key={idx}
              className="rounded-xl overflow-hidden border border-zinc-800/90 bg-[#0c0c0e] my-2.5"
            >
              <div className="flex items-center justify-between px-3.5 py-2 bg-zinc-900/70 border-b border-zinc-800/80 text-[11px] font-mono text-zinc-400">
                <span className="lowercase text-zinc-400">{lang}</span>
                <button
                  onClick={() => copyCode(code, idx)}
                  className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                  {copiedIdx === idx ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 overflow-x-auto font-mono text-xs text-zinc-200 leading-relaxed">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        const lines = part.trim().split('\n');
        return (
          <div key={idx} className="space-y-2">
            {lines.map((line, lIdx) => {
              const t = line.trim();
              if (!t) return null;

              if (t.startsWith('### ')) {
                return (
                  <h4
                    key={lIdx}
                    className="text-sm font-semibold text-white tracking-tight pt-1"
                  >
                    {t.replace('### ', '')}
                  </h4>
                );
              }

              if (t.startsWith('|') && t.endsWith('|')) {
                if (t.includes('---')) return null;
                const cells = t
                  .split('|')
                  .slice(1, -1)
                  .map((c) => c.trim());
                return (
                  <div
                    key={lIdx}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 px-3.5 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800/60 font-mono text-xs"
                  >
                    {cells.map((cell, cIdx) => (
                      <div
                        key={cIdx}
                        className={
                          cells.length === 3
                            ? cIdx === 0
                              ? 'sm:col-span-4 text-emerald-400 font-medium'
                              : cIdx === 1
                                ? 'sm:col-span-4 text-zinc-400'
                                : 'sm:col-span-4 text-zinc-300'
                            : 'sm:col-span-3 text-zinc-300 truncate'
                        }
                      >
                        {cell.replace(/`/g, '')}
                      </div>
                    ))}
                  </div>
                );
              }

              if (t.startsWith('- ') || /^\d+\.\s/.test(t)) {
                return (
                  <div key={lIdx} className="flex items-start gap-2.5 pl-1">
                    <span className="text-zinc-500 mt-0.5 select-none">•</span>
                    <span
                      className="flex-1 text-zinc-300"
                      dangerouslySetInnerHTML={{
                        __html: formatInline(t.replace(/^(- |\d+\.\s)/, '')),
                      }}
                    />
                  </div>
                );
              }

              return (
                <p
                  key={lIdx}
                  className="text-zinc-300"
                  dangerouslySetInnerHTML={{ __html: formatInline(t) }}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

function formatInline(text: string): string {
  return text
    .replace(
      /\*\*([^*]+)\*\*/g,
      '<strong class="font-semibold text-zinc-100">$1</strong>',
    )
    .replace(
      /`([^`]+)`/g,
      '<code class="px-1.5 py-0.5 rounded-md bg-zinc-800/90 text-emerald-300 font-mono text-xs">$1</code>',
    );
}

const WarpBlock: React.FC<{ block: TerminalBlock }> = ({ block }) => {
  const isRunning = block.status === 'thinking' || block.status === 'executing_tool';
  const [traceOpen, setTraceOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 hover:border-zinc-800 transition-colors overflow-hidden">
      {/* Command Prompt Line */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-zinc-800/60 bg-zinc-900/50">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="text-emerald-400 font-mono text-sm font-semibold select-none">
            ❯
          </span>
          <span className="font-mono text-sm text-zinc-100 font-medium break-all">
            {block.command}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-400 font-mono text-[11px]">
            {block.agentName}
          </span>
          <StatusPill status={block.status} label={block.statusLabel} />
        </div>
      </div>

      {/* Compact Collapsible Execution Steps */}
      {block.steps.length > 0 && (
        <div className="px-5 py-2 bg-zinc-950/40 border-b border-zinc-800/40">
          <button
            onClick={() => setTraceOpen((prev) => !prev)}
            className="flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors py-0.5"
          >
            {traceOpen || isRunning ? (
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
            )}
            <span>
              {isRunning
                ? block.steps[block.steps.length - 1]?.title
                : `${block.steps.length} execution steps completed`}
            </span>
          </button>

          {(traceOpen || isRunning) && (
            <div className="mt-2.5 mb-1 pl-4 border-l border-zinc-800 space-y-2">
              {block.steps.map((s) => (
                <div key={s.id} className="text-xs font-mono space-y-0.5">
                  <div className="flex items-center justify-between text-zinc-300">
                    <span>{s.title}</span>
                    {s.durationMs && (
                      <span className="text-zinc-600">{s.durationMs}ms</span>
                    )}
                  </div>
                  {s.detail && <p className="text-zinc-500 text-[11px]">{s.detail}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Output Body */}
      <div className="p-5">
        {block.output ? (
          <MarkdownContent content={block.output} />
        ) : (
          <div className="flex items-center gap-2.5 text-xs font-mono text-zinc-500">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            <span>Streaming agent response...</span>
          </div>
        )}

        {/* Grounded Sources */}
        {block.sources && block.sources.length > 0 && (
          <div className="mt-4 pt-3.5 border-t border-zinc-800/60 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono text-zinc-500 flex items-center gap-1 mr-1">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              Sources:
            </span>
            {block.sources.map((src, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-300"
                title={src.quote}
              >
                <span className="text-emerald-400">{src.documentName}</span>
                <span className="text-zinc-500">
                  {(src.similarity * 100).toFixed(0)}%
                </span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const AgentTerminal: React.FC<AgentTerminalProps> = ({
  terminalState,
  isStandalone = false,
}) => {
  const {
    agents,
    activeAgent,
    selectAgent,
    blocks,
    commandHistory,
    isStreaming,
    executeCommand,
    stopActiveStream,
    clearTerminal,
  } = terminalState;

  const [input, setInput] = useState('');
  const [historyCursor, setHistoryCursor] = useState(-1);
  const [suggestionIdx, setSuggestionIdx] = useState(0);
  const [spawnOpen, setSpawnOpen] = useState(false);
  const [spawnName, setSpawnName] = useState('');
  const [spawnRole, setSpawnRole] = useState('');

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [blocks]);

  const suggestions = useMemo(() => {
    const t = input.trim();
    if (!t.startsWith('/')) return [];
    if (t.startsWith('/agent switch')) {
      return agents.map((a) => ({
        command: `/agent switch ${a.id}`,
        argsHint: a.model,
        description: a.role,
        category: 'agent' as const,
      }));
    }
    return SLASH_COMMAND_SUGGESTIONS.filter(
      (s) =>
        s.command.toLowerCase().startsWith(t.toLowerCase()) ||
        t.toLowerCase().startsWith(s.command.toLowerCase()),
    );
  }, [input, agents]);

  useEffect(() => {
    setSuggestionIdx(0);
  }, [suggestions.length]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'c' && isStreaming) {
      e.preventDefault();
      stopActiveStream();
      return;
    }

    if (e.key === 'Tab' && suggestions.length > 0) {
      e.preventDefault();
      const picked = suggestions[suggestionIdx] || suggestions[0];
      if (picked) setInput(picked.command + ' ');
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (!input.trim()) return;
      executeCommand(input);
      setInput('');
      setHistoryCursor(-1);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (suggestions.length > 0 && input.startsWith('/')) {
        setSuggestionIdx((p) => (p > 0 ? p - 1 : suggestions.length - 1));
        return;
      }
      if (!commandHistory.length) return;
      const next =
        historyCursor === -1
          ? commandHistory.length - 1
          : Math.max(0, historyCursor - 1);
      setHistoryCursor(next);
      setInput(commandHistory[next] || '');
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (suggestions.length > 0 && input.startsWith('/')) {
        setSuggestionIdx((p) => (p < suggestions.length - 1 ? p + 1 : 0));
        return;
      }
      if (historyCursor === -1) return;
      const next = historyCursor + 1;
      if (next >= commandHistory.length) {
        setHistoryCursor(-1);
        setInput('');
      } else {
        setHistoryCursor(next);
        setInput(commandHistory[next] || '');
      }
    }
  };

  const handleCreateAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!spawnName.trim()) return;
    executeCommand(
      `/agent create ${spawnName.trim()} --role "${
        spawnRole.trim() || 'Specialist Agent'
      }"`,
    );
    setSpawnName('');
    setSpawnRole('');
    setSpawnOpen(false);
  };

  return (
    <div
      className={`flex flex-col bg-[#09090b] text-zinc-100 font-sans ${
        isStandalone ? 'h-screen w-screen' : 'h-full w-full'
      }`}
    >
      {/* Minimalist Tab Bar */}
      <div className="flex items-center justify-between gap-4 px-4 sm:px-6 h-13 border-b border-zinc-800/80 bg-[#0c0c0e] shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {agents.map((agent) => {
            const active = agent.id === activeAgent.id;
            return (
              <button
                key={agent.id}
                onClick={() => selectAgent(agent.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all shrink-0 ${
                  active
                    ? 'bg-zinc-800 text-zinc-100 font-medium shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    active ? 'bg-emerald-400' : 'bg-zinc-700'
                  }`}
                />
                <span>{agent.name}</span>
              </button>
            );
          })}

          <button
            onClick={() => setSpawnOpen((p) => !p)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors shrink-0"
            title="Create new agent"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Agent</span>
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => executeCommand('/help')}
            className="px-2.5 py-1 rounded-lg text-xs font-mono text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
          >
            /help
          </button>
          <button
            onClick={clearTerminal}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors"
            title="Clear terminal"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Inline New Agent Bar */}
      {spawnOpen && (
        <form
          onSubmit={handleCreateAgent}
          className="px-4 sm:px-6 py-3 bg-zinc-900/90 border-b border-zinc-800 flex flex-wrap items-center gap-3"
        >
          <input
            type="text"
            value={spawnName}
            onChange={(e) => setSpawnName(e.target.value)}
            placeholder="Agent name (e.g. code-reviewer)"
            className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-100 focus:outline-none focus:border-zinc-600"
            required
          />
          <input
            type="text"
            value={spawnRole}
            onChange={(e) => setSpawnRole(e.target.value)}
            placeholder="Role (e.g. TypeScript Architect)"
            className="flex-1 min-w-[180px] px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-100 focus:outline-none focus:border-zinc-600"
          />
          <button
            type="submit"
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-medium"
          >
            Create Agent
          </button>
        </form>
      )}

      {/* Blocks Stream */}
      <div
        ref={scrollRef}
        onClick={() => inputRef.current?.focus()}
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-6"
      >
        <div className="max-w-4xl mx-auto space-y-4">
          {blocks.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <TerminalIcon className="w-8 h-8 text-zinc-700 mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-zinc-300">
                  {activeAgent.name} Session Ready
                </p>
                <p className="text-xs font-mono text-zinc-500">
                  Model: {activeAgent.model} • Profile: {activeAgent.backendProfile}
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {[
                  '/help',
                  '/agent list',
                  'Explain Atlas-v3 Corrective RAG workflow',
                  'Inspect PostgreSQL pgvector schema',
                ].map((cmd) => (
                  <button
                    key={cmd}
                    onClick={() => executeCommand(cmd)}
                    className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-zinc-300 transition-colors"
                  >
                    {cmd}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            blocks.map((b) => <WarpBlock key={b.id} block={b} />)
          )}
        </div>
      </div>

      {/* Bottom Floating Warp Prompt Bar */}
      <div className="px-4 sm:px-6 pb-5 pt-2 bg-gradient-to-t from-[#09090b] via-[#09090b] to-transparent shrink-0">
        <div className="max-w-4xl mx-auto relative">
          {/* Slash Command Autocomplete Popover */}
          {suggestions.length > 0 && input.startsWith('/') && (
            <div className="absolute bottom-full left-0 right-0 mb-2 rounded-2xl border border-zinc-800 bg-zinc-900/95 backdrop-blur-xl shadow-2xl overflow-hidden z-30">
              <div className="px-4 py-2 border-b border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <Command className="w-3 h-3" /> Commands
                </span>
                <span>Tab to complete • ↑↓ to select</span>
              </div>
              <div className="max-h-56 overflow-y-auto divide-y divide-zinc-800/40">
                {suggestions.map((s, idx) => {
                  const active = idx === suggestionIdx;
                  return (
                    <button
                      key={s.command}
                      type="button"
                      onClick={() => {
                        setInput(s.command + ' ');
                        inputRef.current?.focus();
                      }}
                      className={`w-full flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-4 py-2.5 text-left font-mono text-xs transition-colors ${
                        active
                          ? 'bg-zinc-800/90 text-white'
                          : 'text-zinc-400 hover:bg-zinc-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-medium">
                          {s.command}
                        </span>
                        {s.argsHint && (
                          <span className="text-zinc-500 text-[11px]">
                            {s.argsHint}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-zinc-400">
                        {s.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Prompt Input Box */}
          <div className="flex items-center gap-3 p-2 pl-4 rounded-2xl border border-zinc-800 bg-zinc-900/90 focus-within:border-zinc-700 shadow-lg transition-colors">
            <span className="text-xs font-mono text-emerald-400 font-medium shrink-0 select-none">
              {activeAgent.id} ❯
            </span>

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything or type / for commands (/agent create, /agent switch, /help)..."
              className="flex-1 bg-transparent font-mono text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none min-w-0"
              autoFocus
            />

            {isStreaming ? (
              <button
                type="button"
                onClick={stopActiveStream}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-mono font-medium transition-colors shrink-0"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (!input.trim()) return;
                  executeCommand(input);
                  setInput('');
                }}
                disabled={!input.trim()}
                className="p-2 rounded-xl bg-zinc-100 hover:bg-white disabled:opacity-30 text-zinc-950 transition-all shrink-0"
                aria-label="Run command"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentTerminal;
