/**
 * domain types, zero imports
 */
// ─── Domain: message & status ─────────────────────────────────────────────────
// Pure data shapes — no logic, no imports.

export interface CLIMessage {
  id: string;
  role: "user" | "assistant";
  content: string; // accumulated plain text
}

export type ClaudeStatus =
  | "idle"
  | "submitted"
  | "streaming"
  | "error"
  | "disconnected";

// ─── Hook options ─────────────────────────────────────────────────────────────

export interface UseClaudeCodeOptions {
  /** Working directory passed to Claude Code CLI. Defaults to '.' */
  cwd?: string;
  /** Override the Claude model. e.g. 'claude-sonnet-4-5' */
  model?: string;
  /** Called when a full response finishes streaming */
  onFinish?: (opts: { messages: CLIMessage[]; cost?: number }) => void;
  /** Called on error */
  onError?: (err: Error) => void;
}

// ─── Hook return ──────────────────────────────────────────────────────────────

export interface UseClaudeCodeReturn {
  messages: CLIMessage[];
  status: ClaudeStatus;
  error: string | undefined;
  sendMessage: (text: string) => Promise<void>;
}
