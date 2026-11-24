import { repositories } from '@/database'
import { createChatStore } from './chatStore'
import { createNavigationStore } from './navigationStore'
import { createSettingsStore } from './settingsStore'
import { createToastStore } from './toastStore'

/** Instancias de la aplicación. Los tests crean las suyas. */
export const settingsStore = createSettingsStore(repositories.settings)
export const navigationStore = createNavigationStore()
export const toastStore = createToastStore()
export const chatStore = createChatStore()
