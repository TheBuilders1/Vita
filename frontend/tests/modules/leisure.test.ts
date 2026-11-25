import { expect, it } from 'vitest'
import { getRecordType } from '@/modules/registry'

it('guarda la clave wifi tal como se escribió y propone compartirla con el hogar', () => {
  const type = getRecordType('wifi')
  const data = { name: 'Invitados', password: ' ejemplo de clave ' }
  expect(type.schema.parse(data)).toEqual(data)
  expect(type.visibility.default).toBe('family')
})

it.each([
  ['shoppingItem', { list: 'lista', name: 'Leche' }],
  ['memory', { title: 'Un viaje', date: '2026-10-21' }],
  ['device', { name: 'Tableta', kind: 'tablet' }],
  ['socialAccount', { network: 'Fotos', member: 'leo', privacy: 'private' }],
  ['transaction', { concept: 'Luz', category: 'home', date: '2026-10-21', amount: 100, kind: 'expense' }],
  ['foodItem', { name: 'Arroz' }],
] as const)('carga una ficha antigua de %s sin los campos nuevos', (id, data) => {
  expect(getRecordType(id).schema.safeParse(data).success).toBe(true)
})
