import { createStore } from 'zustand/vanilla'
import type { CardStatus, Reply } from '@/services/chat'
import { session, MAX_TURNS } from '@/services/chat/session'
import { newId } from '@/utils/ids'

export type { CardStatus }
export type AssistantDetails = Extract<Reply, { kind: 'agenda' | 'facts' }>
export interface Turn { readonly id: string; readonly message: string; readonly reply: Reply; readonly details?: AssistantDetails; readonly remote?: boolean; readonly cards: Readonly<Record<number, CardStatus>> }
export interface TurnExtra { readonly details?: AssistantDetails; readonly remote?: boolean }

/** La conversación pertenece al perfil activo de esta pestaña. */
export interface ChatState {
  actorId: string | null
  /** El servidor del hogar guarda el hilo con este identificador; cambia al empezar de nuevo o de perfil. */
  conversationId: string
  turns: Turn[]
  /** Deja la conversación vacía si es de otro perfil. */
  enter: (actorId: string) => void
  add: (message: string, reply: Reply, extra?: TurnExtra) => string
  updateReply: (turnId: string, reply: Reply) => void
  mark: (turnId: string, card: number, status: CardStatus) => void
  clear: () => void
}

const KEY = 'vita.chat.session'

function restore(actorId: string): Pick<ChatState, 'conversationId' | 'turns'> {
  try {
    const saved = session.safeParse(JSON.parse(sessionStorage.getItem(KEY) ?? 'null'))
    if (saved.success && saved.data.actorId === actorId) return { conversationId: saved.data.conversationId ?? newId(), turns: saved.data.turns }
  } catch {
    // Puede estar bloqueado el almacenamiento o haberse dañado la conversación.
  }
  return { conversationId: newId(), turns: [] }
}

export const createChatStore = () => {
  const store = createStore<ChatState>()((set) => ({
    actorId: null,
    conversationId: newId(),
    turns: [],
    enter: (actorId) => set(s => s.actorId === actorId ? s : { actorId, ...(s.actorId === null ? restore(actorId) : { conversationId: newId(), turns: [] }) }),
    add: (message, reply, { details, remote = false } = {}) => {
      const id = newId()
      set(s => ({ turns: [...s.turns, { id, message, reply, ...(details && { details }), remote, cards: {} }].slice(-MAX_TURNS) }))
      return id
    },
    updateReply: (turnId, reply) => set(s => ({ turns: s.turns.map(t => t.id === turnId ? { ...t, reply } : t) })),
    mark: (turnId, card, status) => set(s => ({ turns: s.turns.map(t => t.id === turnId ? { ...t, cards: { ...t.cards, [card]: status } } : t) })),
    clear: () => set({ conversationId: newId(), turns: [] }),
  }))
  store.subscribe(({ actorId, conversationId, turns }) => {
    try {
      if (turns.length && actorId) sessionStorage.setItem(KEY, JSON.stringify({ actorId, conversationId, turns }))
      else sessionStorage.removeItem(KEY)
    } catch {
      // Si falta espacio o el navegador lo bloquea, se puede seguir hablando en memoria.
    }
  })
  return store
}
