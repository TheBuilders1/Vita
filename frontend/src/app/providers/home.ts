import { useLiveQuery } from 'dexie-react-hooks'
import { createContext, use } from 'react'
import { repositories } from '@/database'
import type { Family, Member } from '@/types/family'
import type { FamilyRecord } from '@/types/records'

/** La casa vista por el perfil activo: `records` ya solo contiene lo que puede ver. */
export interface Home {
  readonly family: Family
  readonly members: readonly Member[]
  readonly actor: Member
  readonly records: readonly FamilyRecord[]
}

/** undefined: cargando · null: todavía no hay familia. */
export function useHomeQuery(): Home | null | undefined {
  return useLiveQuery(async () => {
    const [family, actor] = await Promise.all([repositories.family.get(), repositories.session.active()])
    if (!family || !actor) return null
    const [members, records] = await Promise.all([repositories.family.listMembers(), repositories.records.list(actor.id)])
    // Los identificadores son aleatorios: sin esto, las listas saldrían en cualquier orden.
    return { family, actor, members, records: records.toSorted((a, b) => a.createdAt.localeCompare(b.createdAt)) }
  }, [])
}

export const HomeContext = createContext<Home | null>(null)

export function useHome(): Home {
  const home = use(HomeContext)
  if (!home) throw new Error('useHome solo se puede usar dentro de AppLayout')
  return home
}
