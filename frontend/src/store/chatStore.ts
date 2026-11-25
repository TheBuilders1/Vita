import { createStore } from 'zustand/vanilla'
import type { CardStatus, Reply } from '@/services/chat'
import { session, MAX_TURNS } from '@/services/chat/session'
import { newId } from '@/utils/ids'

export type { CardStatus }
export interface Turn { readonly id: string; readonly message: string; readonly reply: Reply; readonly remote?: boolean; readonly cards: Readonly<Record<number, CardStatus>> }

/** La conversación pertenece al perfil activo de esta pestaña. */
export interface ChatState {
  actorId: string | null
  turns: Turn[]
  /** Deja la conversación vacía si es de otro perfil. */
  enter: (actorId: string) => void
  add: (message: string, reply: Reply, remote?: boolean) => void
  mark: (turnId: string, card: number, status: CardStatus) => void
  clear: () => void
}

const KEY = 'vita.chat.session'

function restore(actorId: string): Turn[] {
  try {
    const saved = session.safeParse(JSON.parse(sessionStorage.getItem(KEY) ?? 'null'))
    if (saved.success && saved.data.actorId === actorId) return saved.data.turns
  } catch {
    // Puede estar bloqueado el almacenamiento o haberse dañado la conversación.
  }
  return []
}

export const createChatStore = () => {
  const store = createStore<ChatState>()((set) => ({
    actorId: null,
    turns: [],
    enter: (actorId) => set(s => s.actorId === actorId ? s : { actorId, turns: s.actorId === null ? restore(actorId) : [] }),
    add: (message, reply, remote = false) => set(s => ({ turns: [...s.turns, { id: newId(), message, reply, remote, cards: {} }].slice(-MAX_TURNS) })),
    mark: (turnId, card, status) => set(s => ({ turns: s.turns.map(t => t.id === turnId ? { ...t, cards: { ...t.cards, [card]: status } } : t) })),
    clear: () => set({ turns: [] }),
  }))
  store.subscribe(({ actorId, turns }) => {
    try {
      if (turns.length && actorId) sessionStorage.setItem(KEY, JSON.stringify({ actorId, turns }))
      else sessionStorage.removeItem(KEY)
    } catch {
      // Si falta espacio o el navegador lo bloquea, se puede seguir hablando en memoria.
    }
  })
  return store
}
