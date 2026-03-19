import { describe, it, expect, vi } from "vitest";
import { parseNDJSON, extractText } from "../src/core/parser.js";
import { StateManager } from "../src/core/state.js";
import type { AssistantEvent } from "../src/core/parser.js";

// ─────────────────────────────────────────────────────────────────────────────
// parser.ts
// ─────────────────────────────────────────────────────────────────────────────

describe("parseNDJSON", () => {
  it("parses a valid system init event", () => {
    const line = JSON.stringify({
      type: "system",
      subtype: "init",
      session_id: "abc123",
    });
    const result = parseNDJSON(line);
    expect(result).toEqual({
      type: "system",
      subtype: "init",
      session_id: "abc123",
    });
  });

  it("parses a stream_event delta", () => {
    const line = JSON.stringify({
      type: "stream_event",
      event: {
        type: "content_block_delta",
        index: 0,
        delta: { type: "text_delta", text: "Hello" },
      },
    });
    const result = parseNDJSON(line);
    expect(result?.type).toBe("stream_event");
  });

  it("parses a result success event", () => {
    const line = JSON.stringify({
      type: "result",
      subtype: "success",
      total_cost_usd: 0.002,
    });
    const result = parseNDJSON(line);
    expect(result).toEqual({
      type: "result",
      subtype: "success",
      total_cost_usd: 0.002,
    });
  });

  it("returns null for empty string", () => {
    expect(parseNDJSON("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(parseNDJSON("   \n")).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    expect(parseNDJSON("{ not valid json")).toBeNull();
  });
});

describe("extractText", () => {
  it("extracts text from a single text block", () => {
    const event: AssistantEvent = {
      type: "assistant",
      message: { content: [{ type: "text", text: "Hello world" }] },
    };
    expect(extractText(event)).toBe("Hello world");
  });

  it("joins multiple text blocks", () => {
    const event: AssistantEvent = {
      type: "assistant",
      message: {
        content: [
          { type: "text", text: "Hello" },
          { type: "text", text: " world" },
        ],
      },
    };
    expect(extractText(event)).toBe("Hello world");
  });

  it("ignores tool_use blocks", () => {
    const event: AssistantEvent = {
      type: "assistant",
      message: {
        content: [
          { type: "tool_use", id: "tool_1", name: "Read" },
          { type: "text", text: "Done" },
        ],
      },
    };
    expect(extractText(event)).toBe("Done");
  });

  it("returns empty string when no text blocks", () => {
    const event: AssistantEvent = {
      type: "assistant",
      message: { content: [{ type: "tool_use", id: "tool_1", name: "Bash" }] },
    };
    expect(extractText(event)).toBe("");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// state.ts — StateManager
// ─────────────────────────────────────────────────────────────────────────────

describe("StateManager — initial state", () => {
  it("starts idle with empty messages", () => {
    const sm = new StateManager();
    const state = sm.snapshot();
    expect(state.status).toBe("idle");
    expect(state.messages).toEqual([]);
    expect(state.error).toBeUndefined();
    expect(state.sessionId).toBeUndefined();
  });
});

describe("StateManager — startTurn", () => {
  it("appends user and assistant messages and sets status to submitted", () => {
    const sm = new StateManager();
    sm.startTurn("user-1", "asst-1", "Hello Claude");
    const state = sm.snapshot();
    expect(state.status).toBe("submitted");
    expect(state.messages).toHaveLength(2);
    expect(state.messages[0]).toMatchObject({
      id: "user-1",
      role: "user",
      content: "Hello Claude",
    });
    expect(state.messages[1]).toMatchObject({
      id: "asst-1",
      role: "assistant",
      content: "",
    });
  });

  it("clears previous error on new turn", () => {
    const sm = new StateManager();
    sm.setError("previous error");
    sm.startTurn("user-1", "asst-1", "Retry");
    expect(sm.snapshot().error).toBeUndefined();
  });
});

describe("StateManager — apply system init", () => {
  it("stores session_id", () => {
    const sm = new StateManager();
    sm.apply(
      { type: "system", subtype: "init", session_id: "ses_abc" },
      "asst-1",
    );
    expect(sm.snapshot().sessionId).toBe("ses_abc");
  });
});

describe("StateManager — apply stream_event", () => {
  it("appends delta text to the correct assistant message", () => {
    const sm = new StateManager();
    sm.startTurn("user-1", "asst-1", "Hi");
    sm.apply(
      {
        type: "stream_event",
        event: {
          type: "content_block_delta",
          index: 0,
          delta: { type: "text_delta", text: "Hello" },
        },
      },
      "asst-1",
    );
    sm.apply(
      {
        type: "stream_event",
        event: {
          type: "content_block_delta",
          index: 0,
          delta: { type: "text_delta", text: " world" },
        },
      },
      "asst-1",
    );
    const asst = sm.snapshot().messages.find((m) => m.id === "asst-1");
    expect(asst?.content).toBe("Hello world");
  });

  it("sets status to streaming", () => {
    const sm = new StateManager();
    sm.startTurn("user-1", "asst-1", "Hi");
    sm.apply(
      {
        type: "stream_event",
        event: {
          type: "content_block_delta",
          index: 0,
          delta: { type: "text_delta", text: "Hi" },
        },
      },
      "asst-1",
    );
    expect(sm.snapshot().status).toBe("streaming");
  });

  it("does not modify other messages", () => {
    const sm = new StateManager();
    sm.startTurn("user-1", "asst-1", "Hi");
    sm.apply(
      {
        type: "stream_event",
        event: {
          type: "content_block_delta",
          index: 0,
          delta: { type: "text_delta", text: "Reply" },
        },
      },
      "asst-1",
    );
    const user = sm.snapshot().messages.find((m) => m.id === "user-1");
    expect(user?.content).toBe("Hi");
  });
});

describe("StateManager — apply assistant event", () => {
  it("replaces assistant message content with full text", () => {
    const sm = new StateManager();
    sm.startTurn("user-1", "asst-1", "Hi");
    sm.apply(
      {
        type: "assistant",
        message: { content: [{ type: "text", text: "Full response" }] },
      },
      "asst-1",
    );
    const asst = sm.snapshot().messages.find((m) => m.id === "asst-1");
    expect(asst?.content).toBe("Full response");
  });
});

describe("StateManager — apply result", () => {
  it("sets status to idle on success", () => {
    const sm = new StateManager();
    sm.startTurn("user-1", "asst-1", "Hi");
    sm.apply(
      { type: "result", subtype: "success", total_cost_usd: 0.001 },
      "asst-1",
    );
    expect(sm.snapshot().status).toBe("idle");
  });

  it("calls onFinish with messages and cost on success", () => {
    const onFinish = vi.fn();
    const sm = new StateManager({ onFinish });
    sm.startTurn("user-1", "asst-1", "Hi");
    sm.apply(
      { type: "result", subtype: "success", total_cost_usd: 0.005 },
      "asst-1",
    );
    expect(onFinish).toHaveBeenCalledOnce();
    expect(onFinish).toHaveBeenCalledWith(
      expect.objectContaining({ cost: 0.005 }),
    );
  });

  it("sets status to error on error_max_turns", () => {
    const sm = new StateManager();
    sm.startTurn("user-1", "asst-1", "Hi");
    sm.apply({ type: "result", subtype: "error_max_turns" }, "asst-1");
    expect(sm.snapshot().status).toBe("error");
    expect(sm.snapshot().error).toBe("error_max_turns");
  });

  it("calls onError on failure", () => {
    const onError = vi.fn();
    const sm = new StateManager({ onError });
    sm.startTurn("user-1", "asst-1", "Hi");
    sm.apply({ type: "result", subtype: "error" }, "asst-1");
    expect(onError).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe("StateManager — setError", () => {
  it("sets status to error and stores message", () => {
    const sm = new StateManager();
    sm.setError("something went wrong");
    expect(sm.snapshot().status).toBe("error");
    expect(sm.snapshot().error).toBe("something went wrong");
  });
});

describe("StateManager — setDisconnected", () => {
  it("sets status to disconnected", () => {
    const sm = new StateManager();
    sm.setDisconnected();
    expect(sm.snapshot().status).toBe("disconnected");
  });
});

describe("StateManager — subscribe", () => {
  it("notifies subscriber on state change", () => {
    const sm = new StateManager();
    const cb = vi.fn();
    sm.subscribe(cb);
    sm.startTurn("user-1", "asst-1", "Hi");
    expect(cb).toHaveBeenCalledOnce();
  });

  it("unsubscribe stops notifications", () => {
    const sm = new StateManager();
    const cb = vi.fn();
    const unsub = sm.subscribe(cb);
    unsub();
    sm.startTurn("user-1", "asst-1", "Hi");
    expect(cb).not.toHaveBeenCalled();
  });

  it("snapshot returns a copy — mutations do not affect internal state", () => {
    const sm = new StateManager();
    sm.startTurn("user-1", "asst-1", "Hi");
    const snap = sm.snapshot();
    snap.messages.push({ id: "x", role: "user", content: "injected" });
    expect(sm.snapshot().messages).toHaveLength(2);
  });
});

describe("StateManager — destroy", () => {
  it("removes all subscribers", () => {
    const sm = new StateManager();
    const cb = vi.fn();
    sm.subscribe(cb);
    sm.destroy();
    sm.startTurn("user-1", "asst-1", "Hi");
    expect(cb).not.toHaveBeenCalled();
  });
});
