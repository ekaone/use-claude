/**
 * ClaudeEvent types + parseNDJSON()
 */

// ─── NDJSON event shapes emitted by Claude Code CLI ──────────────────────────
// Each line of --output-format stream-json stdout is one of these.

export interface SystemInitEvent {
  type: "system";
  subtype: "init";
  session_id: string;
}

export interface StreamEvent {
  type: "stream_event";
  event: {
    type: "content_block_delta";
    index: number;
    delta: { type: "text_delta"; text: string };
  };
}

export interface AssistantEvent {
  type: "assistant";
  message: {
    content: Array<
      | { type: "text"; text: string }
      | { type: "tool_use"; [k: string]: unknown }
    >;
  };
}

export interface ResultEvent {
  type: "result";
  subtype: "success" | "error_max_turns" | "error";
  total_cost_usd?: number;
}

export type ClaudeEvent =
  | SystemInitEvent
  | StreamEvent
  | AssistantEvent
  | ResultEvent;

// ─── Pure parse function ──────────────────────────────────────────────────────
// Converts a raw NDJSON line from stdout into a typed ClaudeEvent.
// Returns null for blank lines or malformed JSON — callers skip null.

export function parseNDJSON(line: string): ClaudeEvent | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as ClaudeEvent;
  } catch {
    return null;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Extract plain text from an AssistantEvent content array.

export function extractText(event: AssistantEvent): string {
  return event.message.content
    .filter((c): c is { type: "text"; text: string } => c.type === "text")
    .map((c) => c.text)
    .join("");
}
