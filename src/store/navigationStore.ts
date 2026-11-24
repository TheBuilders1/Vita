import { createStore } from 'zustand/vanilla'

export type Entry = '/bienvenida' | '/crear'

/** A dónde va quien se queda sin familia. Lo decide quien la borra, para no competir con la redirección. */
export interface NavigationState { entry: Entry; setEntry: (entry: Entry) => void }

export const createNavigationStore = () =>
  createStore<NavigationState>()((set) => ({ entry: '/bienvenida', setEntry: (entry) => set({ entry }) }))
