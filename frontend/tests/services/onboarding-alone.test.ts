import { expect, test } from 'vitest'
import { EMPTY_DRAFT, restoreDraft, visibleSteps, type Draft } from '@/services/onboarding'
import { ALONE, RELATIONSHIPS } from '@/data/relationships'

const ids = (d: Draft) => visibleSteps(d).map((s) => s.id)

test('quien vive solo no ve los pasos de las demás personas', () => {
  const alone: Draft = { ...EMPTY_DRAFT, detailed: true, alone: true }
  expect(ids(alone)).toEqual(['name', 'you', 'needs', 'modules', 'look'])
})

test('un borrador antiguo sin el dato no vive solo', () => {
  const raw = JSON.stringify({ name: 'Casa', members: EMPTY_DRAFT.members, hasPets: false, modules: null, detailed: false })
  expect(restoreDraft(raw).alone).toBe(false)
})

test('hay muchas formas de vivir: sin repetidos y con opciones neutras', () => {
  const values = RELATIONSHIPS.flatMap((g) => g.options)
  expect(new Set(values).size).toBe(values.length)
  expect(values).toEqual(expect.arrayContaining(['Pareja', 'Persona cuidadora', 'Compañero o compañera de piso', 'Madre de acogida', 'Hijastro']))
  expect(values).not.toContain(ALONE)
})
