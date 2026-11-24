import { createStore } from 'zustand/vanilla'
import type { CardStatus, Reply } from '@/services/chat'
import { newId } from '@/utils/ids'

export type { CardStatus }
export interface Turn { readonly id: string; readonly message: string; readonly reply: Reply; readonly cards: Readonly<Record<number, CardStatus>> }

/** La conversación vive en memoria y es de un solo perfil: al cambiar de perfil o recargar, desaparece. */
export interface ChatState {
  actorId: string | null
  turns: Turn[]
  /** Deja la conversación vacía si es de otro perfil. */
  enter: (actorId: string) => void
  add: (message: string, reply: Reply) => void
  mark: (turnId: string, card: number, status: CardStatus) => void
  clear: () => void
}

const MAX_TURNS = 50

export const createChatStore = () =>
  createStore<ChatState>()((set) => ({
    actorId: null,
    turns: [],
    enter: (actorId) => set((s) => (s.actorId === actorId ? s : { actorId, turns: [] })),
    add: (message, reply) => set((s) => ({ turns: [...s.turns, { id: newId(), message, reply, cards: {} }].slice(-MAX_TURNS) })),
    mark: (turnId, card, status) => set((s) => ({ turns: s.turns.map((t) => (t.id === turnId ? { ...t, cards: { ...t.cards, [card]: status } } : t)) })),
    clear: () => set({ turns: [] }),
  }))
