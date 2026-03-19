/**
 * re-exports all 4 core modules
 */

// types — domain shapes, no logic
export type {
  CLIMessage,
  ClaudeStatus,
  UseClaudeCodeOptions,
  UseClaudeCodeReturn,
} from "./types.js";

// parser — NDJSON event types + pure parse fn
export { parseNDJSON, extractText } from "./parser.js";
export type {
  ClaudeEvent,
  SystemInitEvent,
  StreamEvent,
  AssistantEvent,
  ResultEvent,
} from "./parser.js";

// state — SessionState shape + StateManager
export { StateManager } from "./state.js";
export type { SessionState } from "./state.js";

// session — Tauri IPC orchestration
export { ClaudeSession } from "./session.js";
