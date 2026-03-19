# @ekaone/use-claude

> ⚠️ **Under Active Development until v0.1.0.** 

React hook (and future framework adapters) for sending prompts to **Claude Code CLI**
via **Tauri IPC** and streaming the response back to your UI.

> ⚠️ **Tauri desktop apps only.** Requires `@tauri-apps/api`. Does not work in
> browser-only or server-side environments. Not a replacement for `useChat` from
> Vercel AI SDK, which targets HTTP endpoints.

## Architecture

```
React UI
  └─ useClaudeCode()               ← @ekaone/use-claude/react
       └─ ClaudeSession            ← @ekaone/use-claude (core/session.ts)
            └─ StateManager        ← core/state.ts  (NDJSON → state transitions)
            └─ parseNDJSON()       ← core/parser.ts (raw line → ClaudeEvent)
            └─ Tauri invoke('send_to_claude')
                 └─ Rust spawns claude CLI subprocess
                      └─ streams NDJSON → Tauri events → hook state
```

### Core structure

```
src/
├── core/
│   ├── types.ts       ← domain types (CLIMessage, ClaudeStatus, options)
│   ├── parser.ts      ← ClaudeEvent types + parseNDJSON() + extractText()
│   ├── state.ts       ← StateManager — owns all state transitions
│   ├── session.ts     ← ClaudeSession — Tauri IPC orchestration only
│   └── index.ts       ← re-exports all core
├── react/
│   └── useClaudeCode.ts   ← useState/useEffect wrapper (~40 lines)
├── svelte/
│   └── useClaudeCode.ts   ← placeholder (v0.3.0)
└── vue/
    └── useClaudeCode.ts   ← placeholder (v0.3.0)
```

---

## Installation

```bash
pnpm add @ekaone/use-claude
```

`@tauri-apps/api` is a required peer dependency — install it if not already present:

```bash
pnpm add @tauri-apps/api
```

---

## Rust side (Tauri)

Add this command to your Tauri backend (`src-tauri/src/claude.rs`):

```rust
use tauri::{command, AppHandle, Emitter};
use std::process::{Command, Stdio};
use std::io::{BufRead, BufReader};

#[command]
pub async fn send_to_claude(
    app: AppHandle,
    prompt: String,
    cwd: String,
    model: String,
) -> Result<(), String> {
    let mut args = vec![
        "--output-format", "stream-json",
        "--print", &prompt,
    ];
    if !model.is_empty() {
        args.extend(["--model", &model]);
    }

    let mut child = Command::new("claude")
        .args(&args)
        .current_dir(&cwd)
        .stdout(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;

    let stdout = child.stdout.take().unwrap();
    let reader = BufReader::new(stdout);

    for line in reader.lines() {
        let line = line.map_err(|e| e.to_string())?;
        app.emit("claude-event", &line).ok();
    }

    app.emit("claude-done", "").ok();
    Ok(())
}
```

Register in `main.rs`:

```rust
tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![claude::send_to_claude])
    .run(tauri::generate_context!())
```

---

## React usage

```tsx
import { useState } from 'react'
import { useClaudeCode } from '@ekaone/use-claude/react'

export function ChatPanel() {
  const { messages, status, error, sendMessage } = useClaudeCode({
    cwd:      '/path/to/project',
    model:    'claude-sonnet-4-5',
    onFinish: ({ cost }) => console.log('cost:', cost),
    onError:  (err)      => console.error(err),
  })

  const [input, setInput] = useState('')

  const handleSend = () => {
    if (!input.trim() || status !== 'idle') return
    sendMessage(input)
    setInput('')
  }

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>
          <strong>{m.role}</strong>: {m.content}
        </div>
      ))}

      {status === 'streaming' && <span>Claude is typing…</span>}
      {error && <span style={{ color: 'red' }}>{error}</span>}

      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSend()}
      />
      <button onClick={handleSend} disabled={status !== 'idle'}>
        Send
      </button>
    </div>
  )
}
```

---

## Options

| Option     | Type                            | Default | Description                      |
|------------|---------------------------------|---------|----------------------------------|
| `cwd`      | `string`                        | `'.'`   | Working directory for Claude CLI |
| `model`    | `string`                        | `''`    | Claude model override            |
| `onFinish` | `({ messages, cost? }) => void` | —       | Called when response completes   |
| `onError`  | `(err: Error) => void`          | —       | Called on error                  |

## Return values

| Value         | Type                                                                 | Description               |
|---------------|----------------------------------------------------------------------|---------------------------|
| `messages`    | `CLIMessage[]`                                                       | Full conversation history |
| `status`      | `'idle' \| 'submitted' \| 'streaming' \| 'error' \| 'disconnected'` | Current stream state      |
| `error`       | `string \| undefined`                                                | Last error message        |
| `sendMessage` | `(text: string) => Promise<void>`                                    | Send a prompt to Claude   |

## CLIMessage shape

```ts
interface CLIMessage {
  id:      string               // crypto.randomUUID()
  role:    'user' | 'assistant'
  content: string               // accumulated plain text
}
```

---

## Future adapters

Svelte and Vue adapters are scaffolded — they share the same `ClaudeSession` core
and will be available in v0.3.0:

```ts
import { useClaudeCode } from '@ekaone/use-claude/svelte'  // v0.3.0
import { useClaudeCode } from '@ekaone/use-claude/vue'     // v0.3.0
```

---

## Related

- [agent-desk](https://github.com/ekaone/agent-desk) — the desktop app that consumes this package
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) — the underlying CLI this hook wraps

---

## License

MIT © Eka Prasetia

---

⭐ If this library helps you, please consider giving it a star on GitHub!
