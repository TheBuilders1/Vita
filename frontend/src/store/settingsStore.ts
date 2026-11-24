import { createStore } from 'zustand/vanilla'
import { DEFAULT_SETTINGS, type Settings, type SettingsRepository } from '@/database/repositories/settings'

export interface SettingsState {
  settings: Settings
  load: () => Promise<void>
  update: (changes: Partial<Settings>) => Promise<void>
}

export const createSettingsStore = (repository: SettingsRepository) =>
  createStore<SettingsState>()((set, get) => ({
    settings: DEFAULT_SETTINGS,
    load: async () => set({ settings: await repository.load() }),
    /** Se aplica al momento; si no se puede guardar, se deshace. */
    update: async (changes) => {
      const previous = get().settings
      set({ settings: { ...previous, ...changes } })
      try {
        await repository.save(get().settings)
      } catch (error) {
        set({ settings: previous })
        throw error
      }
    },
  }))
