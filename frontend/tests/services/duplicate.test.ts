import { describe, expect, test } from 'vitest'
import { getRecordType, RECORD_TYPES } from '@/modules/registry'
import { canDuplicate, duplicateData } from '@/services/duplicate'
import { buildMember, buildRecord } from '../support/builders'

const admin = buildMember('mama', 'master')
const copy = (typeId: string, data: Record<string, unknown>) => duplicateData(buildRecord({ typeId, moduleId: getRecordType(typeId).moduleId, data }))

describe('datos de la copia', () => {
  test('conserva lo escrito pero vuelve a estar pendiente', () => {
    expect(copy('task', { title: 'Regar', members: ['mama'], done: true })).toMatchObject({ title: 'Regar', members: ['mama'], done: false })
  })
  test('no arrastra lo que leyó la app de una foto', () => {
    const data = copy('document', { title: 'DNI', kind: 'id', expiryDate: '2027-01-01', scannedDate: '2027-01-01', scannedFile: 'f1', files: ['f1'] })
    expect(data).toEqual({ title: 'DNI', kind: 'id', expiryDate: '2027-01-01', files: ['f1'] })
  })
  test('cambiar la copia no cambia el original', () => {
    const original = buildRecord({ data: { title: 'Regar', members: ['mama'], done: false } })
    ;(duplicateData(original).members as string[]).push('otro')
    expect(original.data.members).toEqual(['mama'])
  })
})

describe('qué se puede duplicar', () => {
  test('lo que se puede crear', () => {
    expect(canDuplicate(admin, buildRecord())).toBe(true)
    expect(canDuplicate(buildMember('x', 'member', { moduleAccess: { planner: 'read' } }), buildRecord())).toBe(false)
  })
  test('una ficha de emergencia o una toma son únicas', () => {
    for (const typeId of ['emergencyCard', 'medicationIntake']) {
      expect(RECORD_TYPES.some((t) => t.id === typeId)).toBe(true)
      expect(canDuplicate(admin, buildRecord({ typeId, moduleId: getRecordType(typeId).moduleId }))).toBe(false)
    }
  })
  test('quien solo lee el módulo no puede ofrecer una copia sobre otra persona', () => {
    expect(canDuplicate(buildMember('x', 'member', { moduleAccess: { planner: 'read' } }), buildRecord({ subjectIds: ['mama'] }))).toBe(false)
  })
})
