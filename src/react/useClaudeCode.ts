import { useState, useEffect, useCallback, useRef } from "react";
import { ClaudeSession } from "../core/session.js";
import { type SessionState } from "../core/state.js";
import type {
  UseClaudeCodeOptions,
  UseClaudeCodeReturn,
} from "../core/types.js";

export function useClaudeCode(
  opts: UseClaudeCodeOptions = {},
): UseClaudeCodeReturn {
  // Stable session instance — survives re-renders
  const sessionRef = useRef<ClaudeSession | null>(null);

  if (!sessionRef.current) {
    sessionRef.current = new ClaudeSession(opts);
  }

  const [state, setState] = useState<SessionState>(() =>
    sessionRef.current!.getState(),
  );

  useEffect(() => {
    const session = sessionRef.current!;

    // Bridge core callbacks → React state
    const unsubscribe = session.onUpdate((next) => setState(next));

    return () => {
      unsubscribe();
      session.destroy();
      sessionRef.current = null;
    };
  }, []); // intentionally empty — session lives for component lifetime

  const sendMessage = useCallback(async (text: string) => {
    await sessionRef.current?.send(text);
  }, []);

  return {
    messages: state.messages,
    status: state.status,
    error: state.error,
    sendMessage,
  };
}
