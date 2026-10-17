#!/usr/bin/env node
import readline from 'node:readline';
import { ANSI, c, highlightPromptInput } from './ui/theme.js';
import {
  drawHairlineBox,
  renderClaudeCodeTurn,
  renderExecutionTraceBox,
  renderWelcomeCard,
  SPINNER_FRAMES,
} from './ui/renderer.js';
import {
  AgentRegistry,
  AUTH_STORE_FILE,
  SLASH_COMMANDS,
  type SlashCommandDef,
} from './core/agentRegistry.js';
import { executeAgentQueryStream } from './core/executor.js';

const registry = new AgentRegistry();
const commandHistory: string[] = [
  '/auth',
  '/whoami',
  '/agent list',
  'Explain how Atlas-v3 Corrective RAG validates citations',
  '/agent create security-auditor --model gemini-3.8-flash --role "Security Architect"',
];

interface WizardState {
  step: 'name' | 'email' | 'role';
  name: string;
  email: string;
}

let activeAuthWizard: WizardState | null = null;

/**
 * Handles Slash Commands (/auth, /whoami, /logout, /agent create, /agent switch, /agent list, /agent config, /logs, /clear, /help, /exit)
 */
async function handleSlashCommand(raw: string): Promise<boolean> {
  const parts = raw.trim().split(/\s+/);
  const cmd = parts[0]?.toLowerCase();
  const sub = parts[1]?.toLowerCase();

  if (cmd === '/exit' || cmd === '/quit') {
    process.stdout.write(
      `\n  ${c.coral('⏺')} ${c.muted('Session ended.')}\n\n`,
    );
    process.exit(0);
  }

  if (cmd === '/clear') {
    process.stdout.write(ANSI.clearScreen);
    console.log(
      renderWelcomeCard(registry.getActive(), registry.getAll(), registry.getAuthUser()),
    );
    return true;
  }

  if (cmd === '/logs') {
    console.log('\n' + renderExecutionTraceBox(registry.getLastSteps()) + '\n');
    return true;
  }

  if (cmd === '/whoami') {
    const u = registry.getAuthUser();
    if (!u) {
      console.log(
        `\n  ${c.coral('⏺')} ${c.bold('AuthSession')}${c.dim('(status)')}\n  ${c.dim('⎿')}  ${c.amber('Not authenticated.')} Run ${c.coral('/auth')} to configure your developer identity.\n`,
      );
      return true;
    }
    console.log(
      [
        '',
        `  ${c.coral('⏺')} ${c.bold('AuthSession')}${c.dim(`(${u.email})`)}`,
        `  ${c.dim('⎿')}  ${c.emerald('✔ Authenticated session active')}`,
        `     ${c.muted('Name:')}          ${c.text(u.name)}`,
        `     ${c.muted('Email:')}         ${c.text(u.email)}`,
        `     ${c.muted('Role:')}          ${c.text(u.role)}`,
        `     ${c.muted('Organization:')}  ${c.text(u.organization)}`,
        `     ${c.muted('Stored At:')}     ${c.dim(AUTH_STORE_FILE)}`,
        '',
      ].join('\n'),
    );
    return true;
  }

  if (cmd === '/logout') {
    registry.clearAuthUser();
    console.log(
      `\n  ${c.coral('⏺')} ${c.bold('AuthLogout')}${c.dim('()')}\n  ${c.dim('⎿')}  Cleared user credentials from ${c.dim(AUTH_STORE_FILE)}\n`,
    );
    return true;
  }

  if (cmd === '/auth') {
    // Support both inline flags (/auth --name "Jane Doe" --email jane@acme.dev --role "Staff Engineer")
    // and interactive 3-step prompt wizard when invoked as `/auth`
    const nameMatch = raw.match(/--name\s+"([^"]+)"|--name\s+([^\s]+)/i);
    const emailMatch = raw.match(/--email\s+"([^"]+)"|--email\s+([^\s]+)/i);
    const roleMatch = raw.match(/--role\s+"([^"]+)"|--role\s+([^\s]+)/i);

    if (nameMatch || emailMatch) {
      const existing = registry.getAuthUser();
      const name = (nameMatch?.[1] || nameMatch?.[2] || existing?.name || 'Developer').trim();
      const email = (emailMatch?.[1] || emailMatch?.[2] || existing?.email || 'dev@ai-engineering.local').trim();
      const role = (roleMatch?.[1] || roleMatch?.[2] || existing?.role || 'Staff AI Engineer').trim();
      const record = {
        name,
        email,
        role,
        organization: 'AI Engineering Workspace',
        authenticatedAt: new Date().toISOString(),
      };
      registry.saveAuthUser(record);
      console.log(
        [
          '',
          `  ${c.coral('⏺')} ${c.bold('PersistAuthProfile')}${c.dim('(.auth-store.json)')}`,
          `  ${c.dim('⎿')}  ${c.emerald('✔ Saved developer identity')}`,
          `     ${c.muted('Name:')}   ${c.text(record.name)}`,
          `     ${c.muted('Email:')}  ${c.text(record.email)}`,
          `     ${c.muted('Role:')}   ${c.text(record.role)}`,
          `     ${c.muted('File:')}   ${c.dim(AUTH_STORE_FILE)}`,
          '',
        ].join('\n'),
      );
      return true;
    }

    // Start interactive 3-step wizard
    const current = registry.getAuthUser();
    activeAuthWizard = {
      step: 'name',
      name: current?.name || '',
      email: current?.email || '',
    };
    console.log(
      [
        '',
        `  ${c.coral('⏺')} ${c.bold('Interactive Authentication Setup')}`,
        `  ${c.dim('⎿')}  Your profile will be persisted to ${c.dim('.auth-store.json')}`,
        current
          ? `     ${c.muted(`Current user: ${current.name} <${current.email}> (${current.role})`)}`
          : `     ${c.muted('No profile found. Please enter your details below.')}`,
        '',
      ].join('\n'),
    );
    return true;
  }

  if (cmd === '/help') {
    const rows = SLASH_COMMANDS.map(
      (s) =>
        `  ${c.coral(s.command.padEnd(16))} ${c.muted(
          s.args.padEnd(38),
        )} ${c.dim(s.description)}`,
    );
    console.log(
      '\n' +
        drawHairlineBox(
          [
            c.bold('Slash Commands'),
            '',
            ...rows,
            '',
            c.bold('Keyboard Shortcuts'),
            `  ${c.text('Tab'.padEnd(16))} ${c.dim('Autocomplete slash command or agent ID')}`,
            `  ${c.text('Up / Down'.padEnd(16))} ${c.dim('Navigate command history or autocomplete menu')}`,
            `  ${c.text('/auth'.padEnd(16))} ${c.dim('Interactive user identity setup (persisted to .auth-store.json)')}`,
            `  ${c.text('Ctrl + L'.padEnd(16))} ${c.dim('Clear terminal screen')}`,
            `  ${c.text('Ctrl + C'.padEnd(16))} ${c.dim('Exit CLI')}`,
          ],
          { title: 'Claude Code CLI Reference' },
        ) +
        '\n',
    );
    return true;
  }

  if (cmd === '/agent') {
    if (!sub || sub === 'list') {
      const active = registry.getActive();
      const lines = [
        `${c.dim('ID'.padEnd(18))} ${c.dim('NAME'.padEnd(18))} ${c.dim(
          'MODEL'.padEnd(24),
        )} ${c.dim('TEMP'.padEnd(6))} ${c.dim('ROLE')}`,
        c.border('─'.repeat(80)),
        ...registry.getAll().map((a) => {
          const isCurrent = a.id === active.id;
          const prefix = isCurrent ? c.coral('⏺ ') : '  ';
          return (
            prefix +
            c.text(a.id.padEnd(16)) +
            ' ' +
            c.muted(a.name.padEnd(18)) +
            ' ' +
            c.dim(a.model.slice(0, 22).padEnd(24)) +
            ' ' +
            c.dim(String(a.temperature).padEnd(6)) +
            ' ' +
            c.muted(a.role)
          );
        }),
      ];
      console.log(
        '\n' +
          drawHairlineBox(lines, {
            title: `Agents (${registry.getAll().length})`,
          }) +
          '\n',
      );
      return true;
    }

    if (sub === 'create') {
      const nameArg = parts[2];
      if (!nameArg || nameArg.startsWith('--')) {
        console.log(
          `\n  ${c.rose('⏺ Error:')} Usage: /agent create <name> [--model <id>] [--role "<role>"]\n`,
        );
        return true;
      }

      const modelMatch = raw.match(/--model\s+([^\s]+)/i);
      const roleMatch = raw.match(/--role\s+"([^"]+)"|--role\s+([^\s]+)/i);

      const res = registry.createAgent(nameArg, {
        model: modelMatch ? modelMatch[1] : undefined,
        role: roleMatch ? roleMatch[1] || roleMatch[2] : undefined,
      });

      if (res.error || !res.agent) {
        console.log(`\n  ${c.rose('⏺ Error:')} ${res.error || 'Failed'}\n`);
        return true;
      }

      console.log(
        [
          '',
          `  ${c.coral('⏺')} ${c.bold('SpawnAgent')}${c.dim(`(@${res.agent.id})`)}`,
          `  ${c.dim('⎿')}  ${c.emerald('✔ Created and switched active session')}`,
          `     ${c.muted('Name:')}  ${c.text(res.agent.name)}`,
          `     ${c.muted('Role:')}  ${c.text(res.agent.role)}`,
          `     ${c.muted('Model:')} ${c.dim(res.agent.model)}`,
          '',
        ].join('\n'),
      );
      return true;
    }

    if (sub === 'switch') {
      const target = parts[2];
      if (!target) {
        console.log(
          `\n  ${c.rose('⏺ Error:')} Usage: /agent switch <id>. Available: ${registry
            .getAll()
            .map((a) => a.id)
            .join(', ')}\n`,
        );
        return true;
      }
      const switched = registry.switchAgent(target);
      if (!switched) {
        console.log(
          `\n  ${c.rose('⏺ Error:')} Agent "${target}" not found. Available: ${registry
            .getAll()
            .map((a) => a.id)
            .join(', ')}\n`,
        );
        return true;
      }

      console.log(
        `\n  ${c.coral('⏺')} ${c.bold('SwitchAgent')}${c.dim(`(@${switched.id})`)}\n  ${c.dim('⎿')}  Active agent is now ${c.text(switched.name)} ${c.dim(`(${switched.role})`)}\n`,
      );
      return true;
    }

    if (sub === 'config') {
      const key = parts[2];
      const val = parts.slice(3).join(' ').replace(/^"|"$/g, '');
      if (!key || !val) {
        console.log(
          `\n  ${c.rose('⏺ Error:')} Usage: /agent config <model|temp|role|prompt> <value>\n`,
        );
        return true;
      }
      const res = registry.updateActiveConfig(key, val);
      if (res.error || !res.updated) {
        console.log(`\n  ${c.rose('⏺ Error:')} ${res.error || 'Failed'}\n`);
        return true;
      }
      console.log(
        `\n  ${c.coral('⏺')} ${c.bold('UpdateAgentConfig')}${c.dim(`(@${res.updated.id})`)}\n  ${c.dim('⎿')}  Updated ${c.text(key)} = ${c.coral(val)}\n`,
      );
      return true;
    }

    if (sub === 'delete') {
      const target = parts[2];
      if (!target) {
        console.log(`\n  ${c.rose('⏺ Error:')} Usage: /agent delete <id>\n`);
        return true;
      }
      const res = registry.deleteAgent(target);
      if (res.error) {
        console.log(`\n  ${c.rose('⏺ Error:')} ${res.error}\n`);
        return true;
      }
      console.log(
        `\n  ${c.coral('⏺')} ${c.bold('DeleteAgent')}${c.dim(`(@${res.deleted!.id})`)}\n  ${c.dim('⎿')}  Removed custom agent ${c.text(res.deleted!.name)}\n`,
      );
      return true;
    }
  }

  console.log(
    `\n  ${c.rose('⏺ Unknown command:')} "${raw}". Type ${c.coral('/help')} for available commands.\n`,
  );
  return true;
}

/**
 * Executes a natural language query using the Claude Code tree trace layout (`⏺` + `⎿`)
 */
async function executePromptBlock(query: string): Promise<void> {
  const activeAgent = registry.getActive();
  console.log('');

  let spinnerIdx = 0;
  let statusText = `Initializing @${activeAgent.id}...`;
  let spinnerTimer: NodeJS.Timeout | null = null;

  const renderSpinnerLine = () => {
    const frame = SPINNER_FRAMES[spinnerIdx % SPINNER_FRAMES.length]!;
    spinnerIdx++;
    process.stdout.write(
      `\r${ANSI.clearLine}  ${c.coral(frame)} ${c.muted(statusText)}`,
    );
  };

  spinnerTimer = setInterval(renderSpinnerLine, 80);
  renderSpinnerLine();

  let streamedText = '';

  try {
    for await (const event of executeAgentQueryStream(query, activeAgent)) {
      if (event.type === 'status') {
        statusText = event.message;
      } else if (event.type === 'token') {
        if (spinnerTimer) {
          clearInterval(spinnerTimer);
          spinnerTimer = null;
          process.stdout.write(`\r${ANSI.clearLine}`);
        }
        streamedText += event.chunk;
      } else if (event.type === 'done') {
        if (spinnerTimer) {
          clearInterval(spinnerTimer);
          spinnerTimer = null;
          process.stdout.write(`\r${ANSI.clearLine}`);
        }

        registry.setLastSteps(event.steps);
        const turnOutput = renderClaudeCodeTurn(
          query,
          activeAgent,
          event.steps,
          event.fullOutput || streamedText,
          event.durationMs,
        );
        console.log(turnOutput + '\n');
      }
    }
  } catch (err) {
    if (spinnerTimer) {
      clearInterval(spinnerTimer);
      process.stdout.write(`\r${ANSI.clearLine}`);
    }
    console.log(
      `\n  ${c.rose('⏺ Execution Error')}\n  ${c.dim('⎿')}  ${c.rose(
        err instanceof Error ? err.message : String(err),
      )}\n`,
    );
  }
}

/**
 * Interactive Raw-Mode Claude Code TUI with Live Slash Command Autocomplete & /auth Wizard
 */
async function startInteractiveClaudeTui(): Promise<void> {
  process.stdout.write(ANSI.clearScreen);
  console.log(
    renderWelcomeCard(registry.getActive(), registry.getAll(), registry.getAuthUser()),
  );
  console.log('');

  let buffer = '';
  let historyIndex = -1;
  let suggestionIndex = 0;
  let renderedMenuLines = 0;
  let isBusy = false;

  const getFilteredSuggestions = (input: string): SlashCommandDef[] => {
    if (activeAuthWizard) return [];
    const trimmed = input.trim();
    if (!trimmed.startsWith('/')) return [];

    if (trimmed.startsWith('/agent switch')) {
      return registry.getAll().map((a) => ({
        command: `/agent switch ${a.id}`,
        args: `(${a.model})`,
        description: `${a.name} — ${a.role}`,
      }));
    }

    return SLASH_COMMANDS.filter(
      (s) =>
        s.command.toLowerCase().startsWith(trimmed.toLowerCase()) ||
        trimmed.toLowerCase().startsWith(s.command.toLowerCase()),
    );
  };

  const renderPromptAndMenu = () => {
    if (renderedMenuLines > 0) {
      for (let i = 0; i < renderedMenuLines; i++) {
        process.stdout.write(`\n${ANSI.clearLine}`);
      }
      process.stdout.write(ANSI.cursorUp(renderedMenuLines));
      renderedMenuLines = 0;
    }

    if (activeAuthWizard) {
      const label =
        activeAuthWizard.step === 'name'
          ? 'Full Name (e.g. Jane Doe)'
          : activeAuthWizard.step === 'email'
            ? 'Work Email (e.g. jane@acme.dev)'
            : 'Role / Title (e.g. Staff AI Engineer)';
      const stepNum =
        activeAuthWizard.step === 'name'
          ? '1/3'
          : activeAuthWizard.step === 'email'
            ? '2/3'
            : '3/3';
      const wizardPrompt = `  ${c.coral('auth')} ${c.dim(`[${stepNum}]`)} ${c.text(label)} ${c.coral('❯')} `;
      process.stdout.write(`\r${ANSI.clearLine}${wizardPrompt}${c.text(buffer)}`);
      return;
    }

    const active = registry.getActive();
    const user = registry.getAuthUser();
    const userTag = user ? c.dim(`${user.email.split('@')[0]} · `) : '';
    const promptPrefix = `${userTag}${c.muted(`@${active.id}`)} ${c.coral('❯')} `;
    const highlighted = highlightPromptInput(buffer);

    const suggestions = getFilteredSuggestions(buffer);

    if (suggestions.length > 0 && buffer.startsWith('/')) {
      const maxItems = Math.min(suggestions.length, 6);
      const menuLines: string[] = [
        `  ${c.border('╭─ Commands (Tab to complete, ↑/↓ to navigate) ──────────────────')}`,
      ];

      for (let i = 0; i < maxItems; i++) {
        const s = suggestions[i]!;
        const isSel = i === suggestionIndex % maxItems;
        const marker = isSel ? c.coral('❯') : ' ';
        const cmdText = isSel
          ? c.coral(s.command.padEnd(18))
          : c.text(s.command.padEnd(18));
        menuLines.push(
          `  ${c.border('│')} ${marker} ${cmdText} ${c.dim(
            s.args.slice(0, 22).padEnd(23),
          )} ${c.muted(s.description.slice(0, 40))}`,
        );
      }
      menuLines.push(`  ${c.border('╰────────────────────────────────────────────────────────────────')}`);

      renderedMenuLines = menuLines.length;
      process.stdout.write('\n' + menuLines.join('\n'));
      process.stdout.write(ANSI.cursorUp(renderedMenuLines));
    }

    process.stdout.write(`\r${ANSI.clearLine}${promptPrefix}${highlighted}`);
  };

  const clearMenuBelow = () => {
    if (renderedMenuLines > 0) {
      for (let i = 0; i < renderedMenuLines; i++) {
        process.stdout.write(`\n${ANSI.clearLine}`);
      }
      process.stdout.write(ANSI.cursorUp(renderedMenuLines));
      renderedMenuLines = 0;
    }
  };

  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();

  renderPromptAndMenu();

  process.stdin.on('keypress', async (str: string | undefined, key: readline.Key) => {
    if (isBusy) return;

    // Ctrl+C -> Exit cleanly (or cancel wizard)
    if (key && key.ctrl && key.name === 'c') {
      clearMenuBelow();
      if (activeAuthWizard) {
        activeAuthWizard = null;
        buffer = '';
        process.stdout.write(`\n  ${c.dim('⎿  Cancelled /auth setup.')}\n\n`);
        renderPromptAndMenu();
        return;
      }
      process.stdout.write(`\n\n  ${c.coral('⏺')} ${c.muted('Exited Claude Code CLI.')}\n`);
      process.exit(0);
    }

    // Escape -> Cancel wizard if active
    if (key && key.name === 'escape' && activeAuthWizard) {
      activeAuthWizard = null;
      buffer = '';
      process.stdout.write(`\n  ${c.dim('⎿  Cancelled /auth setup.')}\n\n`);
      renderPromptAndMenu();
      return;
    }

    // Ctrl+L -> Clear screen
    if (key && key.ctrl && key.name === 'l') {
      clearMenuBelow();
      process.stdout.write(ANSI.clearScreen);
      console.log(
        renderWelcomeCard(registry.getActive(), registry.getAll(), registry.getAuthUser()),
      );
      console.log('');
      renderPromptAndMenu();
      return;
    }

    const suggestions = getFilteredSuggestions(buffer);

    // Tab -> Autocomplete
    if (key && key.name === 'tab' && !activeAuthWizard) {
      if (suggestions.length > 0) {
        const chosen = suggestions[suggestionIndex % suggestions.length] || suggestions[0]!;
        buffer = chosen.command + ' ';
        suggestionIndex = 0;
        renderPromptAndMenu();
      }
      return;
    }

    // Up Arrow -> Navigate autocomplete or command history
    if (key && key.name === 'up' && !activeAuthWizard) {
      if (suggestions.length > 0 && buffer.startsWith('/')) {
        suggestionIndex =
          suggestionIndex > 0 ? suggestionIndex - 1 : suggestions.length - 1;
        renderPromptAndMenu();
        return;
      }
      if (commandHistory.length > 0) {
        historyIndex =
          historyIndex === -1
            ? commandHistory.length - 1
            : Math.max(0, historyIndex - 1);
        buffer = commandHistory[historyIndex] || '';
        renderPromptAndMenu();
      }
      return;
    }

    // Down Arrow -> Navigate autocomplete or command history
    if (key && key.name === 'down' && !activeAuthWizard) {
      if (suggestions.length > 0 && buffer.startsWith('/')) {
        suggestionIndex = (suggestionIndex + 1) % suggestions.length;
        renderPromptAndMenu();
        return;
      }
      if (historyIndex !== -1) {
        historyIndex++;
        if (historyIndex >= commandHistory.length) {
          historyIndex = -1;
          buffer = '';
        } else {
          buffer = commandHistory[historyIndex] || '';
        }
        renderPromptAndMenu();
      }
      return;
    }

    // Backspace
    if (key && (key.name === 'backspace' || key.name === 'delete')) {
      buffer = buffer.slice(0, -1);
      suggestionIndex = 0;
      renderPromptAndMenu();
      return;
    }

    // Enter / Return
    if (key && (key.name === 'return' || key.name === 'enter')) {
      clearMenuBelow();
      const submitted = buffer.trim();
      buffer = '';
      historyIndex = -1;
      suggestionIndex = 0;
      process.stdout.write('\n');

      // Handle interactive /auth wizard steps
      if (activeAuthWizard) {
        if (activeAuthWizard.step === 'name') {
          activeAuthWizard.name = submitted || activeAuthWizard.name || 'Ramkrishna Yadav';
          activeAuthWizard.step = 'email';
          renderPromptAndMenu();
          return;
        }
        if (activeAuthWizard.step === 'email') {
          activeAuthWizard.email =
            submitted || activeAuthWizard.email || 'ramkrishna@ai-engineering.dev';
          activeAuthWizard.step = 'role';
          renderPromptAndMenu();
          return;
        }
        if (activeAuthWizard.step === 'role') {
          const role = submitted || 'Principal AI Systems Architect';
          const record = {
            name: activeAuthWizard.name,
            email: activeAuthWizard.email,
            role,
            organization: 'AI Engineering Workspace',
            authenticatedAt: new Date().toISOString(),
          };
          registry.saveAuthUser(record);
          activeAuthWizard = null;
          console.log(
            [
              '',
              `  ${c.coral('⏺')} ${c.bold('PersistAuthProfile')}${c.dim('(.auth-store.json)')}`,
              `  ${c.dim('⎿')}  ${c.emerald('✔ Authenticated & saved developer identity')}`,
              `     ${c.muted('Name:')}   ${c.text(record.name)}`,
              `     ${c.muted('Email:')}  ${c.text(record.email)}`,
              `     ${c.muted('Role:')}   ${c.text(record.role)}`,
              `     ${c.muted('File:')}   ${c.dim(AUTH_STORE_FILE)}`,
              '',
            ].join('\n'),
          );
          renderPromptAndMenu();
          return;
        }
      }

      if (!submitted) {
        renderPromptAndMenu();
        return;
      }

      if (commandHistory[commandHistory.length - 1] !== submitted) {
        commandHistory.push(submitted);
      }

      isBusy = true;
      if (submitted.startsWith('/')) {
        await handleSlashCommand(submitted);
      } else {
        await executePromptBlock(submitted);
      }
      isBusy = false;
      renderPromptAndMenu();
      return;
    }

    // Printable character
    if (str && !key?.ctrl && !key?.meta && str >= ' ') {
      buffer += str;
      suggestionIndex = 0;
      renderPromptAndMenu();
    }
  });
}

/**
 * Entry Point: Supports both interactive TTY mode (`npm run tui`)
 * and CLI batch commands (`npx tsx src/Terminal-Agent/index.ts "/auth --name 'Ramkrishna' --email ram@ai.dev" "/whoami"`)
 */
async function main() {
  const cliArgs = process.argv.slice(2);

  if (cliArgs.length > 0) {
    console.log(
      renderWelcomeCard(registry.getActive(), registry.getAll(), registry.getAuthUser()),
    );
    for (const cmd of cliArgs) {
      const active = registry.getActive();
      console.log(
        `\n${c.muted(`@${active.id}`)} ${c.coral('❯')} ${highlightPromptInput(cmd)}`,
      );
      if (cmd.trim().startsWith('/')) {
        await handleSlashCommand(cmd.trim());
      } else {
        await executePromptBlock(cmd.trim());
      }
    }
    return;
  }

  await startInteractiveClaudeTui();
}

main();
