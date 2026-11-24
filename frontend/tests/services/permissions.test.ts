import { describe, expect, test } from 'vitest'
import { accessTo, canComplete, canCreate, canDelete, canManage, canRead, canUpdate } from '@/services/permissions'
import { buildMember, buildRecord } from '../support/builders'

const master = buildMember('mama', 'master')
const member = buildMember('hijo', 'member')
const other = buildMember('tia', 'member')
const vulnerable = buildMember('abuela', 'vulnerable')

describe('acceso a módulos', () => {
  test('el máster escribe en todos, aunque se le intente limitar', () => {
    expect(accessTo(buildMember('m', 'master', { moduleAccess: { finances: 'none' } }), 'finances')).toBe('write')
  })
  test('los demás parten de la política del módulo', () => {
    expect(accessTo(member, 'finances')).toBe('read')
    expect(accessTo(vulnerable, 'finances')).toBe('none')
    expect(accessTo(member, 'school')).toBe('write')
  })
  test('el ajuste personal manda sobre la política', () => {
    expect(accessTo(buildMember('m', 'member', { moduleAccess: { finances: 'write' } }), 'finances')).toBe('write')
    expect(accessTo(buildMember('m', 'member', { moduleAccess: { school: 'none' } }), 'school')).toBe('none')
  })
  test('nadie baja del mínimo del módulo de emergencias', () => {
    expect(accessTo(buildMember('m', 'vulnerable', { moduleAccess: { emergency: 'none' } }), 'emergency')).toBe('read')
  })
})

describe('leer', () => {
  test('lo familiar lo lee quien tiene acceso al módulo', () => {
    expect(canRead(other, buildRecord())).toBe(true)
    expect(canRead(vulnerable, buildRecord({ typeId: 'transaction', moduleId: 'finances' }))).toBe(false)
  })
  test('lo restringido lo leen autor, protagonista, invitados y másteres', () => {
    const r = buildRecord({ typeId: 'condition', moduleId: 'healthRecord', visibility: 'restricted', ownerId: 'hijo', subjectIds: ['abuela'] })
    expect([master, member, vulnerable].every((m) => canRead(m, r))).toBe(true)
    expect(canRead(other, r)).toBe(false)
    expect(canRead(other, { ...r, sharedWith: ['tia'] })).toBe(true)
  })
  test('lo privado solo lo lee su autor, ni siquiera el máster', () => {
    const r = buildRecord({ visibility: 'private', ownerId: 'hijo', subjectIds: ['mama'] })
    expect(canRead(member, r)).toBe(true)
    expect(canRead(master, r)).toBe(false)
  })
  test('sin acceso al módulo no se lee ni lo propio', () => {
    const locked = buildMember('hijo', 'member', { moduleAccess: { planner: 'none' } })
    expect(canRead(locked, buildRecord({ ownerId: 'hijo' }))).toBe(false)
  })
})

describe('modificar y eliminar', () => {
  test('un miembro solo cambia lo que ha creado', () => {
    expect(canUpdate(member, buildRecord({ ownerId: 'hijo' }))).toBe(true)
    expect(canUpdate(member, buildRecord({ ownerId: 'mama', subjectIds: ['hijo'] }))).toBe(false)
    expect(canDelete(member, buildRecord({ ownerId: 'mama' }))).toBe(false)
  })
  test('el máster cambia cualquier registro que pueda ver', () => {
    expect(canUpdate(master, buildRecord({ ownerId: 'hijo' }))).toBe(true)
    expect(canDelete(master, buildRecord({ ownerId: 'hijo', visibility: 'private' }))).toBe(false)
  })
  test('perder la escritura en el módulo impide cambiar hasta lo propio', () => {
    expect(canUpdate(member, buildRecord({ typeId: 'transaction', moduleId: 'finances', ownerId: 'hijo' }))).toBe(false)
  })
  test('quien anota su propia toma puede corregirla o borrarla', () => {
    const own = buildRecord({ typeId: 'medicationIntake', moduleId: 'medication', ownerId: 'abuela', subjectIds: ['abuela'], visibility: 'restricted' })
    expect(canUpdate(vulnerable, own)).toBe(true)
    expect(canDelete(vulnerable, own)).toBe(true)
    expect(canDelete(vulnerable, { ...own, ownerId: 'mama' })).toBe(false)
  })
})

describe('crear', () => {
  test('hace falta escritura en el módulo', () => {
    expect(canCreate(member, 'task', [])).toBe(true)
    expect(canCreate(member, 'transaction', [])).toBe(false)
  })
  test('con solo lectura se pueden anotar las tomas propias, no las ajenas', () => {
    expect(canCreate(vulnerable, 'medicationIntake', ['abuela'])).toBe(true)
    expect(canCreate(vulnerable, 'medicationIntake', ['mama'])).toBe(false)
    expect(canCreate(vulnerable, 'medicationPlan', ['abuela'])).toBe(false)
  })
})

describe('completar', () => {
  test('lo completa quien es responsable aunque no sea el autor', () => {
    expect(canComplete(member, buildRecord({ ownerId: 'mama', subjectIds: ['hijo'] }))).toBe(true)
    expect(canComplete(other, buildRecord({ ownerId: 'mama', subjectIds: ['hijo'] }))).toBe(false)
  })
  test('una tarea sin responsable la completa cualquiera que pueda verla', () => {
    expect(canComplete(vulnerable, buildRecord())).toBe(true)
  })
  test('no se completa lo que no se puede completar', () => {
    expect(canComplete(master, buildRecord({ typeId: 'event' }))).toBe(false)
  })
})

describe('administrar', () => {
  test('solo el máster administra familia, módulos y datos', () => {
    for (const area of ['family', 'modules', 'data'] as const) {
      expect(canManage(master, area)).toBe(true)
      expect(canManage(member, area)).toBe(false)
      expect(canManage(vulnerable, area)).toBe(false)
    }
  })
})
