import type { VitaDb } from '@/database/db'
import { NotFoundError } from '@/services/errors'
import type { Member } from '@/types/family'

export interface RepositoryContext {
  readonly db: VitaDb
  readonly now: () => Date
}

/** Se lee siempre de la base: así un cambio de rol surte efecto al momento. */
export async function loadActor({ db }: RepositoryContext, actorId: string): Promise<Member> {
  const actor = await db.members.get(actorId)
  if (!actor) throw new NotFoundError('Ese perfil ya no existe')
  return actor
}
