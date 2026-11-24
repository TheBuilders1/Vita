import { describe, expect, test } from 'vitest'
import { historyLines, withChange } from '@/services/history'
import { buildMember, buildRecord } from '../support/builders'

const members = [buildMember('ana', 'master', { name: 'Ana' })]
const before = buildRecord({ data: { title: 'Regar', members: [], done: false } })
const change = (after: Partial<typeof before>, at = '2026-11-24T09:00:00.000Z') => withChange(before, { ...before, ...after }, { by: 'ana', at })

describe('qué cambió', () => {
  test('apunta quién, cuándo y qué campos, nunca los valores', () => {
    const next = change({ data: { title: 'Regar el patio', members: [], done: false, notes: 'secreto' } })
    expect(next.history).toEqual([{ by: 'ana', at: '2026-11-24T09:00:00.000Z', kind: 'changed', fields: ['title', 'notes'] }])
    expect(JSON.stringify(next.history)).not.toContain('secreto')
  })
  test('guardar sin cambiar nada no deja rastro', () => expect(change({}).history).toBeUndefined())
  test('marcar como hecho y como pendiente', () => {
    const done = change({ data: { ...before.data, done: true } })
    expect(done.history?.[0]).toMatchObject({ kind: 'done', fields: [] })
    expect(withChange(done, { ...done, data: { ...done.data, done: false } }, { by: 'ana', at: '2026-11-24T10:00:00.000Z' }).history?.at(-1)).toMatchObject({ kind: 'pending' })
  })
  test('quién puede verlo', () => expect(change({ visibility: 'private' }).history?.[0]).toMatchObject({ kind: 'changed', fields: ['@access'] }))
  test('lo que anota la app no cuenta', () => {
    const doc = buildRecord({ typeId: 'document', moduleId: 'documents', data: { title: 'DNI', kind: 'id', expiryDate: '2027-01-01' } })
    expect(withChange(doc, { ...doc, data: { ...doc.data, scannedDate: '2027-01-01', scannedFile: 'f' } }, { by: 'ana', at: '2026-11-24T09:00:00.000Z' }).history).toBeUndefined()
  })
  test('se guardan los últimos 200', () => {
    let record = before
    for (let i = 0; i < 230; i++) record = withChange(record, { ...record, data: { ...record.data, title: `T${i}` } }, { by: 'ana', at: `2026-11-24T09:00:00.${String(i).padStart(3, '0')}Z` })
    expect(record.history).toHaveLength(200)
    expect(record.history?.at(-1)?.at).toBe('2026-11-24T09:00:00.229Z')
  })
})

describe('cómo se lee', () => {
  test('lo último primero, con los nombres de los campos', () => {
    const one = change({ data: { ...before.data, title: 'A', notes: 'x', dueDate: '2026-12-01' } })
    const two = withChange(one, { ...one, visibility: 'private' }, { by: 'fantasma', at: '2026-11-25T09:00:00.000Z' })
    expect(historyLines(two, members).map((l) => l.text)).toEqual(['Antiguo integrante cambió quién puede verlo', 'Ana cambió Tarea, Para cuándo y Notas'])
  })
  test('hecho, pendiente y recuperado', () => {
    const at = '2026-11-24T09:00:00.000Z'
    const record = { ...before, history: (['done', 'pending', 'restored'] as const).map((kind) => ({ by: 'ana', at, kind, fields: [] })) }
    expect(historyLines(record, members).map((l) => l.text)).toEqual(['Ana lo recuperó de la papelera', 'Ana lo marcó como pendiente', 'Ana lo marcó como hecho'])
  })
  test('un campo que ya no existe no rompe la lista', () => {
    const record = { ...before, history: [{ by: 'ana', at: '2026-11-24T09:00:00.000Z', kind: 'changed' as const, fields: ['inventado'] }] }
    expect(historyLines(record, members)[0]!.text).toBe('Ana lo cambió')
  })
})
