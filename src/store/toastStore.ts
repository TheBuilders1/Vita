import { createStore } from 'zustand/vanilla'
import { newId } from '@/utils/ids'

export type ToastTone = 'success' | 'error'
export interface ToastAction { readonly label: string; readonly run: () => void }
export interface Toast { id: string; message: string; tone: ToastTone; action?: ToastAction | undefined }

export interface ToastState {
  toasts: Toast[]
  show: (message: string, tone?: ToastTone, action?: ToastAction) => void
  dismiss: (id: string) => void
  clear: () => void
}

const MAX_VISIBLE = 3

/** Los errores esperan a que alguien los cierre: solo se descartan avisos de éxito. */
function trim(toasts: Toast[]): Toast[] {
  if (toasts.length <= MAX_VISIBLE) return toasts
  const oldest = toasts.find((t) => t.tone === 'success') ?? toasts[0]
  return trim(toasts.filter((t) => t !== oldest))
}

export const createToastStore = () =>
  createStore<ToastState>()((set) => ({
    toasts: [],
    show: (message, tone = 'success', action) =>
      set(({ toasts }) => {
        const others = toasts.filter((t) => t.message !== message || t.tone !== tone)
        return { toasts: trim([...others, { id: newId(), message, tone, action }]) }
      }),
    clear: () => set({ toasts: [] }),
    dismiss: (id) => set(({ toasts }) => ({ toasts: toasts.filter((t) => t.id !== id) })),
  }))
