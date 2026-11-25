import { Dexie } from 'dexie'
import { expect, test } from 'vitest'
import { loadPitchHome } from '@/features/pitch/pitchHome'

test('carga Los Robles aparte y borra su base al terminar', async () => {
  const before = await Dexie.getDatabaseNames()
  const home = await loadPitchHome('2026-11-24')
  expect(home.members.map((m) => m.name)).toEqual(['Marta', 'Andrés', 'Leo', 'Pilar'])
  expect(home.records.length).toBeGreaterThan(20)
  expect(await Dexie.getDatabaseNames()).toEqual(before)
})
