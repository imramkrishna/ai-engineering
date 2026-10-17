import { c, visualLength } from './theme.js';
import type { TerminalAgentConfig, ExecutionStep, UserAuthRecord } from '../core/agentRegistry.js';

export const SPINNER_FRAMES = ['✻', '✢', '✳', '✶', '✻', '✺'];

export function getTerminalWidth(): number {
  return Math.min(Math.max(process.stdout.columns || 84, 64), 96);
}

/**
 * Draws a minimal hairline rounded box (Claude Code welcome card style)
 */
export function drawHairlineBox(
  lines: string[],
  optionsOrTitle?: string | { title?: string },
): string {
  const width = getTerminalWidth();
  const innerWidth = width - 4;

  const title =
    typeof optionsOrTitle === 'string' ? optionsOrTitle : optionsOrTitle?.title;
  const titleSegment = title ? ` ${c.muted(title)} ` : '';
  const topDashes = Math.max(1, width - 3 - visualLength(titleSegment));
  const top = c.border('╭─') + titleSegment + c.border('─'.repeat(topDashes) + '╮');

  const body: string[] = [];
  for (const rawLine of lines) {
    const wrapped = wrapLine(rawLine, innerWidth);
    for (const l of wrapped) {
      const pad = Math.max(0, innerWidth - visualLength(l));
      body.push(`${c.border('│')} ${l}${' '.repeat(pad)} ${c.border('│')}`);
    }
  }

  const bottom = c.border(`╰${'─'.repeat(width - 2)}╯`);
  return [top, ...body, bottom].join('\n');
}

function wrapLine(line: string, maxWidth: number): string[] {
  if (visualLength(line) <= maxWidth) return [line];
  const words = line.split(' ');
  const out: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (visualLength(next) <= maxWidth) {
      cur = next;
    } else {
      if (cur) out.push(cur);
      cur = w;
    }
  }
  if (cur) out.push(cur);
  return out.length ? out : [line];
}

/**
 * Renders the restrained Claude Code Welcome Box
 */
export function renderWelcomeCard(
  activeAgent: TerminalAgentConfig,
  _allAgents: TerminalAgentConfig[],
  user: UserAuthRecord | null,
): string {
  const greeting = user
    ? `${c.accent('✻')} ${c.bold(`Welcome back, ${user.name}`)} ${c.muted(`(${user.email})`)}`
    : `${c.accent('✻')} ${c.bold('Claude Code Agent CLI')} ${c.muted('— unauthenticated (run /auth)')}`;

  const lines = [
    greeting,
    '',
    `  ${c.subtle('cwd:')}        ${c.secondary('/Users/ramkrishnayadav/ai-engineering')}`,
    `  ${c.subtle('agent:')}      ${c.white(`@${activeAgent.id}`)} ${c.muted(`(${activeAgent.model} · ${activeAgent.role})`)}`,
    `  ${c.subtle('auth store:')} ${
      user
        ? `${c.success('●')} ${c.secondary('.auth-store.json')} ${c.muted(`[${user.role}]`)}`
        : `${c.accent('○')} ${c.muted('not signed in — type /auth to save user profile')}`
    }`,
    '',
    `  ${c.subtle('commands:')}   ${c.accent('/auth')} ${c.muted('·')} ${c.white('/whoami')} ${c.muted('·')} ${c.white('/agent create')} ${c.muted('·')} ${c.white('/agent switch')} ${c.muted('·')} ${c.white('/agent list')} ${c.muted('·')} ${c.white('/logs')} ${c.muted('·')} ${c.white('/help')}`,
  ];

  return drawHairlineBox(lines, 'claude-code // ai-engineering');
}

/**
 * Renders a Claude Code-style tool execution tree (`⏺` and `⎿`)
 */
export function renderClaudeCodeTurn(
  _query: string,
  _agent: TerminalAgentConfig,
  steps: ExecutionStep[],
  output: string,
  durationMs: number,
  showRawJson = false,
): string {
  const lines: string[] = [];

  for (const step of steps) {
    lines.push(
      `  ${c.accent('⏺')} ${c.bold(step.title)} ${c.subtle(
        step.durationMs ? `(${step.durationMs}ms)` : '',
      )}`,
    );
    if (step.detail) {
      lines.push(`  ${c.subtle('⎿')}  ${c.muted(step.detail)}`);
    }
    if (showRawJson && step.payload) {
      const jsonLines = JSON.stringify(step.payload, null, 2).split('\n');
      for (const jl of jsonLines) {
        lines.push(`     ${c.subtle(jl)}`);
      }
    }
  }

  lines.push('');

  const formattedBody = formatMarkdownLines(output);
  formattedBody.forEach((line, idx) => {
    if (idx === 0) {
      lines.push(`  ${c.accent('⏺')} ${line}`);
    } else {
      lines.push(`    ${line}`);
    }
  });

  lines.push('');
  lines.push(
    `  ${c.subtle(`⎿  Completed in ${(durationMs / 1000).toFixed(2)}s · type /logs to inspect raw tool JSON`)}`,
  );

  return lines.join('\n');
}

export function renderExecutionTraceBox(steps: ExecutionStep[]): string {
  if (!steps.length) {
    return `  ${c.subtle('⎿  No execution trace recorded yet. Run a query first.')}`;
  }
  const lines: string[] = [];
  for (const step of steps) {
    lines.push(
      `  ${c.accent('⏺')} ${c.bold(step.title)} ${c.subtle(`[${step.phase}]`)} ${c.subtle(
        step.durationMs ? `${step.durationMs}ms` : '',
      )}`,
    );
    if (step.detail) {
      lines.push(`  ${c.subtle('⎿')}  ${c.muted(step.detail)}`);
    }
    if (step.payload) {
      const raw = JSON.stringify(step.payload, null, 2).split('\n');
      for (const l of raw) {
        lines.push(`     ${c.subtle(l)}`);
      }
    }
  }
  return lines.join('\n');
}

export function formatMarkdownLines(markdown: string): string[] {
  const raw = markdown.split('\n');
  const out: string[] = [];
  let inCode = false;

  for (const line of raw) {
    if (line.trim().startsWith('```')) {
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      out.push(`  ${c.secondary(line)}`);
      continue;
    }
    const t = line.trim();
    if (t.startsWith('### ') || t.startsWith('## ')) {
      out.push(c.bold(t.replace(/^###?\s+/, '')));
      continue;
    }
    out.push(
      line
        .replace(/\*\*([^*]+)\*\*/g, (_, m) => c.bold(m))
        .replace(/`([^`]+)`/g, (_, m) => c.white(m)),
    );
  }
  return out;
}
