import { useSyncExternalStore } from 'react'
import { useStore } from 'zustand'
import { settingsStore } from '@/store'

const query = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void) {
  const media = matchMedia(query)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

export function useReducedMotion(): boolean {
  const system = useSyncExternalStore(subscribe, () => matchMedia(query).matches)
  return useStore(settingsStore, (s) => s.settings.motion) === 'reduced' || system
}
