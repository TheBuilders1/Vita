import { expect, test } from 'vitest'
import { RECORD_TYPES, getRecordType } from '@/modules/registry'
import { emptyData, firstMessage } from '@/services/formData'

test('un alta parte con la fecha de hoy solo donde es obligatoria', () => {
  expect(emptyData(getRecordType('outing'), '2026-11-24')).toMatchObject({ date: '2026-11-24', endDate: undefined, members: [] })
  expect(emptyData(getRecordType('medicationPlan'), '2026-11-24')).toMatchObject({ startDate: '2026-11-24', times: ['09:00'], weekdays: [] })
  expect(emptyData(getRecordType('recipe'), '2026-11-24').ingredients).toEqual([{ name: '' }])
})
test.each(RECORD_TYPES.map((t) => [t.id, t] as const))('el alta vacía de %s solo falla por datos obligatorios, no por el formato', (_id, type) => {
  const issues = type.schema.safeParse(emptyData(type, '2026-11-24')).error?.issues ?? []
  for (const issue of issues) expect(issue.message).toMatch(/obligatorio|al menos|mayor que cero|Indica|Elige una receta/)
})
test('encuentra el mensaje aunque esté dentro de una lista', () => {
  expect(firstMessage([undefined, { name: { message: 'Este dato es obligatorio' } }])).toBe('Este dato es obligatorio')
  expect(firstMessage({ message: 'x' })).toBe('x')
  expect(firstMessage(undefined)).toBeUndefined()
})
