/**
 * Tauri IPC orchestration only
 */

import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { parseNDJSON } from "./parser.js";
import { StateManager, type SessionState } from "./state.js";
import type { UseClaudeCodeOptions } from "./types.js";

// ─── ClaudeSession ────────────────────────────────────────────────────────────
// Single responsibility: manage the Tauri IPC lifecycle for one chat session.
//   - invoke() the Rust command
//   - listen() for streaming NDJSON events
//   - forward parsed events to StateManager
//   - clean up listeners on destroy
//
// No state logic, no parsing logic — those live in state.ts and parser.ts.

export class ClaudeSession {
  private opts: UseClaudeCodeOptions;
  private sm: StateManager;
  private unlistens: UnlistenFn[] = [];

  constructor(opts: UseClaudeCodeOptions = {}) {
    this.opts = opts;

    // Build StateManager opts explicitly — only include callbacks that exist.
    // Required by exactOptionalPropertyTypes: passing `undefined` into an
    // optional property is a type error under this strict mode.
    const smOpts: Pick<UseClaudeCodeOptions, "onFinish" | "onError"> = {};
    if (opts.onFinish !== undefined) smOpts.onFinish = opts.onFinish;
    if (opts.onError !== undefined) smOpts.onError = opts.onError;

    this.sm = new StateManager(smOpts);
  }

  // ── Subscribe to state changes (used by framework adapters) ──────────────

  onUpdate(fn: (state: SessionState) => void): () => void {
    return this.sm.subscribe(fn);
  }

  // ── Read current state (used for initial hydration in adapters) ───────────

  getState(): SessionState {
    return this.sm.snapshot();
  }

  // ── Send a prompt ─────────────────────────────────────────────────────────

  async send(text: string): Promise<void> {
    const userId: string = crypto.randomUUID();
    const assistantId: string = crypto.randomUUID();

    // 1. Optimistic state update — append user + empty assistant message
    this.sm.startTurn(userId, assistantId, text);

    // 2. Wire Tauri event listeners before invoking (avoid race)
    const unlisten = await listen<string>("claude-event", (e) => {
      const event = parseNDJSON(e.payload);
      if (event) this.sm.apply(event, assistantId);
    });

    const unlistenDone = await listen<string>("claude-done", () => {
      unlisten();
      unlistenDone();
    });

    this.unlistens.push(unlisten, unlistenDone);

    // 3. Invoke the Rust command
    try {
      await invoke("send_to_claude", {
        prompt: text,
        cwd: this.opts.cwd ?? ".",
        model: this.opts.model ?? "",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.sm.setError(msg);
      unlisten();
      unlistenDone();
    }
  }

  // ── Teardown ──────────────────────────────────────────────────────────────

  destroy(): void {
    this.unlistens.forEach((fn) => fn());
    this.unlistens = [];
    this.sm.destroy();
  }
}
