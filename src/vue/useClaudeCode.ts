// Vue adapter — coming in a future release
// Will use Vue's `ref` / `readonly` over ClaudeSession:
//
//   import { ref, readonly, onUnmounted } from 'vue'
//   import { ClaudeSession } from '../core/session.js'
//
//   export function useClaudeCode(opts = {}) {
//     const session  = new ClaudeSession(opts)
//     const messages = ref(session.getState().messages)
//     const status   = ref(session.getState().status)
//     const error    = ref(session.getState().error)
//
//     session.onUpdate((state) => {
//       messages.value = state.messages
//       status.value   = state.status
//       error.value    = state.error
//     })
//
//     onUnmounted(() => session.destroy())
//
//     return {
//       messages: readonly(messages),
//       status:   readonly(status),
//       error:    readonly(error),
//       sendMessage: session.send.bind(session),
//     }
//   }

export {};
