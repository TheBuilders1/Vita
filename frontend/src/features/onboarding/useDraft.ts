import { useState } from 'react'
import { EMPTY_DRAFT, type Draft } from '@/services/onboarding'

const KEY = 'vita-draft'

function read(): Draft {
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(KEY) ?? 'null')
    return saved && typeof saved === 'object' ? { ...EMPTY_DRAFT, ...saved } : EMPTY_DRAFT
  } catch {
    return EMPTY_DRAFT
  }
}

function clearDraft() {
  try { sessionStorage.removeItem(KEY) } catch { /* Nada que limpiar. */ }
}

/** El borrador sobrevive a una recarga, pero no a cerrar la pestaña: contiene datos personales. */
export function useDraft() {
  const [draft, setDraft] = useState(read)
  const update = (changes: Partial<Draft>) => {
    const next = { ...draft, ...changes }
    setDraft(next)
    try { sessionStorage.setItem(KEY, JSON.stringify(next)) } catch { /* Sin almacenamiento de sesión solo se pierde al recargar. */ }
  }
  return { draft, update, clear: clearDraft }
}
