import { useEffect, useState } from 'react'
import { loadDemo } from '@/data/demo'
import { VitaDb } from '@/database/db'
import { createRepositories } from '@/database/repositories'
import type { Member } from '@/types/family'
import type { FamilyRecord } from '@/types/records'
import { todayIso } from '@/utils/dates'

export interface PitchHome { readonly members: readonly Member[]; readonly records: readonly FamilyRecord[]; readonly today: string }

/** Los Robles en una base aparte, que se borra al terminar: la presentación nunca toca el hogar guardado. */
export async function loadPitchHome(today = todayIso()): Promise<PitchHome> {
  const db = new VitaDb(`vita-pitch-${crypto.randomUUID()}`)
  try {
    await loadDemo(db, createRepositories(db), today)
    const members = (await db.members.toArray()).toSorted((a, b) => a.order - b.order)
    return { members, records: await db.records.toArray(), today }
  } finally {
    db.close()
    await db.delete()
  }
}

export function usePitchHome(): PitchHome | undefined {
  const [home, setHome] = useState<PitchHome>()
  useEffect(() => {
    let alive = true
    loadPitchHome().then((loaded) => { if (alive) setHome(loaded) }).catch(() => undefined)
    return () => { alive = false }
  }, [])
  return home
}
