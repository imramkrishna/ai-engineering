/**
 * Claude Code / Vercel Geist Restrained TrueColor ANSI Palette
 * ------------------------------------------------------------
 * Monochromatic dark neutral palette with a single warm terracotta accent (#D97757).
 */

export const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',

  // Cursor & Screen control
  clearScreen: '\x1b[2J\x1b[H',
  clearLine: '\x1b[2K',
  cursorUp: (n = 1) => `\x1b[${n}A`,

  // Claude Code / Geist Foreground Palette
  coral: '\x1b[38;2;217;119;87m',       // #D97757 Claude signature accent
  white: '\x1b[38;2;237;237;237m',      // #EDEDED Primary foreground
  neutral300: '\x1b[38;2;204;204;204m', // #CCCCCC Secondary text
  neutral400: '\x1b[38;2;136;136;136m', // #888888 Muted metadata
  neutral600: '\x1b[38;2;85;85;85m',    // #555555 Subtle labels
  border: '\x1b[38;2;51;51;51m',        // #333333 Hairline box border
  emerald: '\x1b[38;2;46;158;107m',     // #2E9E6B Success indicator
  amber: '\x1b[38;2;217;119;87m',       // #D97757 Warm warning/accent
  rose: '\x1b[38;2;229;72;77m',         // #E5484D Error indicator
};

export const c = {
  accent: (s: string) => `${ANSI.coral}${s}${ANSI.reset}`,
  accentBold: (s: string) => `${ANSI.coral}${ANSI.bold}${s}${ANSI.reset}`,
  coral: (s: string) => `${ANSI.coral}${s}${ANSI.reset}`,
  white: (s: string) => `${ANSI.white}${s}${ANSI.reset}`,
  text: (s: string) => `${ANSI.white}${s}${ANSI.reset}`,
  bold: (s: string) => `${ANSI.white}${ANSI.bold}${s}${ANSI.reset}`,
  secondary: (s: string) => `${ANSI.neutral300}${s}${ANSI.reset}`,
  muted: (s: string) => `${ANSI.neutral400}${s}${ANSI.reset}`,
  subtle: (s: string) => `${ANSI.neutral600}${s}${ANSI.reset}`,
  dim: (s: string) => `${ANSI.neutral600}${s}${ANSI.reset}`,
  border: (s: string) => `${ANSI.border}${s}${ANSI.reset}`,
  success: (s: string) => `${ANSI.emerald}${s}${ANSI.reset}`,
  emerald: (s: string) => `${ANSI.emerald}${s}${ANSI.reset}`,
  amber: (s: string) => `${ANSI.amber}${s}${ANSI.reset}`,
  error: (s: string) => `${ANSI.rose}${s}${ANSI.reset}`,
  rose: (s: string) => `${ANSI.rose}${s}${ANSI.reset}`,
};

export function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

export function visualLength(str: string): number {
  return stripAnsi(str).length;
}

/**
 * Clean syntax highlighting for prompt input
 */
export function highlightPromptInput(input: string): string {
  if (!input) return '';
  if (input.startsWith('/')) {
    const tokens = input.split(/(\s+)/);
    return tokens
      .map((tok, idx) => {
        if (idx === 0) return `${ANSI.coral}${ANSI.bold}${tok}${ANSI.reset}`;
        if (tok.startsWith('--')) return `${ANSI.neutral400}${tok}${ANSI.reset}`;
        return `${ANSI.white}${tok}${ANSI.reset}`;
      })
      .join('');
  }
  return `${ANSI.white}${input}${ANSI.reset}`;
}
