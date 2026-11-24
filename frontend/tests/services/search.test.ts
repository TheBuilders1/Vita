import { describe, expect, test } from 'vitest'
import { searchHome } from '@/services/search'
import { matches, plainText } from '@/utils/text'
import { buildMember, buildRecord } from '../support/builders'

const pilar = buildMember('p', 'vulnerable', { name: 'Pilar Núñez' })
const records = [
  buildRecord({ id: 'r1', data: { title: 'Renovar el pasaporte de Nuria', members: [], done: false } }),
  buildRecord({ id: 'r2', data: { title: 'Llamar al médico', notes: 'Preguntar por el pasaporte sanitario', members: ['p'], done: false }, subjectIds: ['p'] }),
  buildRecord({ id: 'r3', typeId: 'document', moduleId: 'documents', data: { title: 'DNI', kind: 'id', scannedFile: 'secreto' } }),
]
const search = (query: string) => searchHome({ query, records, members: [pilar], modules: ['documents', 'emergency'] })
const ids = (query: string) => search(query).records.map((r) => r.id)

describe('texto sin tildes', () => {
  test('da igual la tilde, la mayúscula y el espacio', () => {
    expect(plainText('  MÉDICO   de  Nuria ')).toBe('medico de nuria')
    expect(matches('Llamar al médico', 'MEDICO')).toBe(true)
  })
  test('la eñe es otra letra', () => {
    expect(matches('Cumpleaños', 'cumpleanos')).toBe(true)
    expect(matches('Año', 'ano')).toBe(true)
    expect(matches('Ana', 'aña')).toBe(false)
  })
  test('todas las palabras, en cualquier orden', () => {
    expect(matches('Renovar el pasaporte', 'pasaporte renovar')).toBe(true)
    expect(matches('Renovar el pasaporte', 'pasaporte comprar')).toBe(false)
    expect(matches('lo que sea', '   ')).toBe(true)
  })
})

describe('buscar en el hogar', () => {
  test('encuentra sin tildes y pone primero lo que coincide en el título', () => {
    expect(ids('medico')).toEqual(['r2'])
    expect(ids('pasaporte')).toEqual(['r1', 'r2'])
  })
  test('encuentra por la persona y por el tipo', () => {
    expect(ids('nunez')).toEqual(['r2'])
    expect(ids('documento dni')).toEqual(['r3'])
  })
  test('no busca en lo que anota la app', () => { expect(ids('secreto')).toEqual([]) })
  test('encuentra habitaciones y personas', () => {
    expect(search('emergencia').modules.map((m) => m.id)).toEqual(['emergency'])
    expect(search('pilar').people.map((m) => m.id)).toEqual(['p'])
  })
  test('sin nada escrito no hay resultados', () => {
    expect(search('  ')).toEqual({ records: [], modules: [], people: [] })
  })
})
