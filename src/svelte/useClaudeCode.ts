// Svelte adapter — coming in a future release
// Will use Svelte's `writable` store over ClaudeSession:
//
//   import { writable } from 'svelte/store'
//   import { ClaudeSession } from '../core/session.js'
//
//   export function useClaudeCode(opts = {}) {
//     const session  = new ClaudeSession(opts)
//     const messages = writable(session.getState().messages)
//     const status   = writable(session.getState().status)
//     const error    = writable(session.getState().error)
//
//     session.onUpdate((state) => {
//       messages.set(state.messages)
//       status.set(state.status)
//       error.set(state.error)
//     })
//
//     return { messages, status, error, sendMessage: session.send.bind(session) }
//   }

export {};
