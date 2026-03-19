/**
 * re-exports all 4 core modules
 */

// types — domain shapes, no logic
export type {
  CLIMessage,
  ClaudeStatus,
  UseClaudeCodeOptions,
  UseClaudeCodeReturn,
} from "./types";

// parser — NDJSON event types + pure parse fn
export { parseNDJSON, extractText } from "./parser";
export type {
  ClaudeEvent,
  SystemInitEvent,
  StreamEvent,
  AssistantEvent,
  ResultEvent,
} from "./parser";

// state — SessionState shape + StateManager
export { StateManager } from "./state";
export type { SessionState } from "./state";

// session — Tauri IPC orchestration
export { ClaudeSession } from "./session";
