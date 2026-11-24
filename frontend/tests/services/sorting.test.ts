import { expect, test } from 'vitest'
import { byRelevance } from '@/services/sorting'
import { buildRecord } from '../support/builders'

const task = (id: string, data: object) => buildRecord({ id, data: { title: id, members: [], done: false, ...data } })
test('ordena próximo, sin fecha, pasado y hecho', () => {
  const list = [task('hecha', { dueDate: '2026-11-25', done: true }), task('vieja', { dueDate: '2026-01-01' }), task('reciente', { dueDate: '2026-11-20' }), task('sin', {}), task('lejos', { dueDate: '2027-01-01' }), task('hoy', { dueDate: '2026-11-24' })]
  expect(list.toSorted(byRelevance('2026-11-24')).map((r) => r.id)).toEqual(['hoy', 'lejos', 'sin', 'reciente', 'vieja', 'hecha'])
})
