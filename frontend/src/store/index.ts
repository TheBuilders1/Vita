import { repositories } from '@/database'
import { createNavigationStore } from './navigationStore'
import { createSettingsStore } from './settingsStore'
import { createToastStore } from './toastStore'

/** Instancias de la aplicación. Los tests crean las suyas. */
export const settingsStore = createSettingsStore(repositories.settings)
export const navigationStore = createNavigationStore()
export const toastStore = createToastStore()
