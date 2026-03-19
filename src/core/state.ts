import type {
  CLIMessage,
  ClaudeStatus,
  UseClaudeCodeOptions,
} from "./types.js";
import { extractText, type ClaudeEvent } from "./parser.js";

// ─── State shape ──────────────────────────────────────────────────────────────

export interface SessionState {
  messages: CLIMessage[];
  status: ClaudeStatus;
  error: string | undefined;
  sessionId: string | undefined;
}

type OnUpdateFn = (state: SessionState) => void;

// ─── StateManager ─────────────────────────────────────────────────────────────
// Owns the state atom + subscriber list.
// Knows how to apply ClaudeEvents to produce the next state.
// No knowledge of Tauri, IPC, or React.

export class StateManager {
  private state: SessionState;
  private listeners: Set<OnUpdateFn> = new Set();
  private opts: Pick<UseClaudeCodeOptions, "onFinish" | "onError">;

  constructor(opts: Pick<UseClaudeCodeOptions, "onFinish" | "onError"> = {}) {
    this.opts = opts;
    this.state = {
      messages: [],
      status: "idle",
      error: undefined,
      sessionId: undefined,
    };
  }

  // ── Subscription ────────────────────────────────────────────────────────────

  subscribe(fn: OnUpdateFn): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  // ── Read ────────────────────────────────────────────────────────────────────

  snapshot(): SessionState {
    return { ...this.state, messages: [...this.state.messages] };
  }

  // ── Write ────────────────────────────────────────────────────────────────────

  private patch(partial: Partial<SessionState>): void {
    this.state = { ...this.state, ...partial };
    const snap = this.snapshot();
    this.listeners.forEach((fn) => fn(snap));
  }

  // ── Convenience mutations (called by ClaudeSession) ───────────────────────

  startTurn(userId: string, assistantId: string, userText: string): void {
    this.patch({
      status: "submitted",
      error: undefined,
      messages: [
        ...this.state.messages,
        { id: userId, role: "user", content: userText },
        { id: assistantId, role: "assistant", content: "" },
      ],
    });
  }

  setDisconnected(): void {
    this.patch({ status: "disconnected" });
  }

  setError(msg: string): void {
    this.patch({ status: "error", error: msg });
    this.opts.onError?.(new Error(msg));
  }

  // ── Apply a ClaudeEvent → next state ────────────────────────────────────────

  apply(event: ClaudeEvent, assistantId: string): void {
    // Session init — store session_id for future resume
    if (event.type === "system" && event.subtype === "init") {
      this.patch({ sessionId: event.session_id });
      return;
    }

    // Token-level delta — stream text into the assistant message
    if (event.type === "stream_event") {
      const delta = event.event?.delta?.text;
      if (!delta) return;
      this.patch({
        status: "streaming",
        messages: this.state.messages.map((m) =>
          m.id === assistantId ? { ...m, content: m.content + delta } : m,
        ),
      });
      return;
    }

    // Full assistant turn — fallback for non-streaming (--print) mode
    if (event.type === "assistant") {
      this.patch({
        messages: this.state.messages.map((m) =>
          m.id === assistantId ? { ...m, content: extractText(event) } : m,
        ),
      });
      return;
    }

    // Result — terminal event for this turn
    if (event.type === "result") {
      if (event.subtype === "success") {
        this.patch({ status: "idle" });
        const finishArg: { messages: CLIMessage[]; cost?: number } = {
          messages: this.state.messages,
        };
        if (event.total_cost_usd !== undefined) {
          finishArg.cost = event.total_cost_usd;
        }
        this.opts.onFinish?.(finishArg);
      } else {
        this.setError(event.subtype);
      }
    }
  }

  // ── Teardown ─────────────────────────────────────────────────────────────────

  destroy(): void {
    this.listeners.clear();
  }
}
