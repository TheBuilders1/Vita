import { useLayoutEffect, type ReactNode } from 'react'
import { useStore } from 'zustand'
import { settingsStore } from '@/store'

/** Lleva las preferencias a <html>; el CSS hace el resto. */
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { textSize, contrast, motion } = useStore(settingsStore, (s) => s.settings)
  useLayoutEffect(() => {
    Object.assign(document.documentElement.dataset, { textSize, contrast, motion })
  }, [textSize, contrast, motion])
  return children
}
