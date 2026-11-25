import { createStore } from 'zustand/vanilla'
import type { CardStatus, Reply } from '@/services/chat'
import { newId } from '@/utils/ids'

export type { CardStatus }
type AssistantDetails = Extract<Reply, { kind: 'agenda' | 'facts' }>
export interface Turn { readonly id: string; readonly message: string; readonly reply: Reply; readonly details?: AssistantDetails; readonly cards: Readonly<Record<number, CardStatus>> }

/** La conversación vive en memoria y es de un solo perfil: al cambiar de perfil o recargar, desaparece. */
export interface ChatState {
  actorId: string | null
  conversationId: string
  turns: Turn[]
  /** Deja la conversación vacía si es de otro perfil. */
  enter: (actorId: string) => void
  add: (message: string, reply: Reply, details?: AssistantDetails) => string
  updateReply: (turnId: string, reply: Reply) => void
  mark: (turnId: string, card: number, status: CardStatus) => void
  clear: () => void
}

const MAX_TURNS = 50

export const createChatStore = () =>
  createStore<ChatState>()((set) => ({
    actorId: null,
    conversationId: newId(),
    turns: [],
    enter: (actorId) => set((s) => (s.actorId === actorId ? s : { actorId, conversationId: newId(), turns: [] })),
    add: (message, reply, details) => {
      const id = newId()
      set((s) => ({ turns: [...s.turns, { id, message, reply, ...(details && { details }), cards: {} }].slice(-MAX_TURNS) }))
      return id
    },
    updateReply: (turnId, reply) => set((s) => ({ turns: s.turns.map((turn) => turn.id === turnId ? { ...turn, reply } : turn) })),
    mark: (turnId, card, status) => set((s) => ({ turns: s.turns.map((t) => (t.id === turnId ? { ...t, cards: { ...t.cards, [card]: status } } : t)) })),
    clear: () => set((s) => ({ ...s, conversationId: newId(), turns: [] })),
  }))
