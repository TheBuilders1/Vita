import { VitaDb } from '@/database/db'
import { createRepositories } from '@/database/repositories'
import type { MemberInput } from '@/types/family'

let counter = 0

/** Base real (IndexedDB en memoria) con un reloj que el test controla. */
export async function openTestHome() {
  const db = new VitaDb(`vita-test-${++counter}`)
  const clock = { now: new Date('2026-11-24T09:00:00.000Z') }
  const repos = createRepositories(db, () => clock.now)
  const { members } = await repos.family.setup({
    family: { name: 'Los Robles', enabledModules: ['pets'] },
    members: [
      person('Marta', 'master'), person('Andrés', 'member'), person('Pilar', 'vulnerable'), person('Nora', 'member'),
    ],
  })
  const [marta, andres, pilar, nora] = members.map((m) => m.id) as [string, string, string, string]
  return { db, clock, ...repos, marta, andres, pilar, nora }
}

export const person = (name: string, role: MemberInput['role']): MemberInput =>
  ({ name, role, birthDate: '1980-05-10', relationship: 'Familia' })
