import type { StoreApi } from 'zustand'
import { MAX_TURNS } from '@/services/chat/session'
import type { ChatState } from '@/store/chatStore'

export function greeting(hour: number) {
  if (hour < 6 || hour >= 21) return 'Buenas noches'
  return hour < 14 ? 'Buenos días' : 'Buenas tardes'
}

export function restartConversation(store: StoreApi<ChatState>) {
  const { actorId, turns, clear } = store.getState()
  clear()
  let restored = false
  return () => {
    if (restored || store.getState().actorId !== actorId) return
    restored = true
    store.setState(state => ({ turns: [...turns, ...state.turns].slice(-MAX_TURNS) }))
  }
}

/** Si la respuesta es larga, se empieza a leer por arriba. */
export function scrollDistance(top: number, bottom: number, visibleTop: number, visibleBottom: number) {
  if (top < visibleTop) return top - visibleTop
  return Math.max(0, Math.min(top - visibleTop, bottom - visibleBottom))
}
