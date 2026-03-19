# @ekaone/use-claude — Roadmap

## Overview

React hook (and future framework adapters) for communicating with **Claude Code CLI**
via **Tauri IPC**.

> ⚠️ **Tauri desktop apps only.** Requires `@tauri-apps/api`. Does not work in
> browser-only or server-side environments.

| | |
|---|---|
| Repo | `github.com/ekaone/use-claude` |
| npm | `@ekaone/use-claude` |
| Monorepo | ❌ standalone repo |
| Distribution | npm public (`pnpm add @ekaone/use-claude`) |
| Runtime | Tauri desktop app (any frontend framework) |

---

## Folder Structure

```
use-claude/                          ← github.com/ekaone/use-claude
│
├── src/
│   ├── core/
│   │   ├── types.ts                 ← domain types, zero imports
│   │   ├── parser.ts                ← ClaudeEvent types + parseNDJSON()
│   │   ├── state.ts                 ← StateManager, patch/notify/apply
│   │   ├── session.ts               ← Tauri IPC orchestration only
│   │   └── index.ts                 ← re-exports all 4
│   ├── react/
│   │   └── useClaudeCode.ts         ← useState/useEffect wrapper
│   ├── svelte/
│   │   └── useClaudeCode.ts         ← placeholder (v0.3.0)
│   └── vue/
│       └── useClaudeCode.ts         ← placeholder (v0.3.0)
│
├── .github/
│   └── workflows/
│       ├── ci.yml                   ← typecheck + vitest on push/PR
│       └── release.yml              ← npm publish on tag v*
│
├── package.json                     ← name: "@ekaone/use-claude"
├── tsup.config.ts
├── tsconfig.json
├── vitest.config.ts
├── CHANGELOG.md
├── ROADMAP.md
└── README.md
```

---

## Usage

```bash
# inside a Tauri app
pnpm add @ekaone/use-claude

# React
import { useClaudeCode } from '@ekaone/use-claude/react'

# Svelte (v0.3.0)
import { useClaudeCode } from '@ekaone/use-claude/svelte'

# Vue (v0.3.0)
import { useClaudeCode } from '@ekaone/use-claude/vue'
```

---

## Release

```bash
git tag v0.1.0   → triggers release.yml → npm publish @ekaone/use-claude
```

---

## v0.1.0 — MVP ✦ current
- [x] 5-file core architecture (`types`, `parser`, `state`, `session`, `index`)
- [x] `ClaudeSession` — Tauri IPC lifecycle management
- [x] `StateManager` — NDJSON event → state transitions
- [x] `useClaudeCode()` React hook
- [x] Svelte + Vue adapter placeholders
- [ ] CI workflow (typecheck + vitest)
- [ ] npm publish workflow
- [ ] README usage examples
- [ ] CHANGELOG.md

## v0.2.0 — Multi-turn + Abort
- [ ] Long-lived Claude Code process (stdin pipe, not `--print` per turn)
- [ ] `stop()` — kill subprocess mid-stream
- [ ] `clearHistory()` — reset message state
- [ ] `sessionId` exposed in hook return

## v0.3.0 — Framework Adapters
- [ ] Svelte adapter (`writable` store)
- [ ] Vue adapter (`ref` composable)
- [ ] Shared adapter test suite

## v0.4.0 — Resume + Tool Calls
- [ ] `resumeStream()` — reconnect via `--resume <sessionId>`
- [ ] `onToolCall` handler map (`'auto'` | custom fn per tool name)
- [ ] `addToolOutput()` — write `tool_result` back to stdin