import { useState } from 'react'
import { hasProgress, restoreDraft, type Draft, type StepId } from '@/services/onboarding'

const KEY = 'vita-draft'
const STEP_KEY = 'vita-draft-step'

function load(key: string): string | null {
  try { return sessionStorage.getItem(key) } catch { return null }
}

function save(key: string, value: string) {
  try { sessionStorage.setItem(key, value) } catch { /* Sin almacenamiento de sesión solo se pierde al recargar. */ }
}

export function clearDraft() {
  for (const key of [KEY, STEP_KEY]) try { sessionStorage.removeItem(key) } catch { /* Nada que limpiar. */ }
}

export const hasDraft = () => hasProgress(restoreDraft(load(KEY)))
export const savedStep = () => load(STEP_KEY)
export const saveStep = (step: StepId) => save(STEP_KEY, step)

/** El borrador sobrevive a una recarga y a salir del asistente, pero no a cerrar la pestaña: contiene datos personales. */
export function useDraft() {
  const [draft, setDraft] = useState(() => restoreDraft(load(KEY)))
  const update = (changes: Partial<Draft>) => {
    const next = { ...draft, ...changes }
    setDraft(next)
    save(KEY, JSON.stringify(next))
  }
  return { draft, update, clear: clearDraft }
}
