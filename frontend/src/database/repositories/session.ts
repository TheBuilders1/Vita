import type { Member } from '@/types/family'
import { loadActor, type RepositoryContext } from './context'

export const SESSION_KEY = 'session'

/** Perfil con el que se usa la app. Es una simulación: no hay contraseña ni autenticación. */
export function createSessionRepository(ctx: RepositoryContext) {
  const { db } = ctx
  return {
    async active(): Promise<Member | undefined> {
      const id = (await db.settings.get(SESSION_KEY))?.value
      const chosen = typeof id === 'string' ? await db.members.get(id) : undefined
      if (chosen) return chosen
      const masters = await db.members.filter((m) => m.role === 'master').toArray()
      return masters.toSorted((a, b) => a.order - b.order)[0]
    },
    async use(memberId: string): Promise<void> {
      await loadActor(ctx, memberId)
      await db.settings.put({ key: SESSION_KEY, value: memberId })
    },
  }
}
