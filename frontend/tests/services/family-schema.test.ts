import { describe, expect, test } from 'vitest'
import { familyInputSchema, memberInputSchema } from '@/types/family'
import { memberPhoto } from '../support/memberPhoto'

const member = { name: 'Marta', birthDate: '1981-03-04', relationship: 'Madre', role: 'master' }
const firstMessage = (input: unknown) => memberInputSchema('2026-11-24').safeParse(input).error?.issues[0]?.message

describe('integrantes', () => {
  test('conserva una foto JPEG válida', () => {
    expect(memberInputSchema('2026-11-24').parse({ ...member, photo: memberPhoto }).photo).toBe(memberPhoto)
  })
  test.each([
    ['otro formato', memberPhoto.replace('jpeg', 'png')],
    ['base64 dañado', 'data:image/jpeg;base64,?'],
    ['datos que no son JPEG', 'data:image/jpeg;base64,AAAA'],
    ['una foto demasiado grande', `data:image/jpeg;base64,${'/9j/'.repeat(100_000)}/9k=`],
  ])('rechaza %s como foto', (_reason, photo) => {
    expect(memberInputSchema('2026-11-24').safeParse({ ...member, photo }).error?.issues[0]?.path).toEqual(['photo'])
  })
  test('acepta lo mínimo y completa los valores por defecto', () => {
    expect(memberInputSchema('2026-11-24').parse(member)).toEqual({ ...member, needs: [], moduleAccess: {} })
  })
  test('explica qué falta', () => {
    expect(firstMessage({ ...member, name: '  ' })).toBe('Escribe el nombre')
    expect(firstMessage({ ...member, birthDate: '1981-02-30' })).toBe('La fecha de nacimiento no es válida')
    expect(firstMessage({ ...member, role: 'admin' })).toBe('Elige un rol')
  })
  test('nadie puede haber nacido en el futuro', () => {
    expect(firstMessage({ ...member, birthDate: '2026-11-25' })).toBe('La fecha de nacimiento no puede ser futura')
    expect(firstMessage({ ...member, birthDate: '2026-11-24' })).toBeUndefined()
  })
  test('rechaza permisos sobre módulos que no existen', () => {
    expect(firstMessage({ ...member, moduleAccess: { nope: 'write' } })).toBeDefined()
    expect(firstMessage({ ...member, moduleAccess: { finances: 'read' } })).toBeUndefined()
  })
})

describe('familia', () => {
  test('exige nombre y descarta módulos repetidos', () => {
    expect(familyInputSchema.safeParse({ name: ' ', enabledModules: [] }).success).toBe(false)
    expect(familyInputSchema.parse({ name: 'Los Robles', enabledModules: ['pets', 'pets'] }).enabledModules).toContain('pets')
  })
  test('emergencias y los demás módulos esenciales de uso común no se pueden apagar', () => {
    const { enabledModules } = familyInputSchema.parse({ name: 'Los Robles', enabledModules: [] })
    expect(enabledModules.toSorted()).toEqual(['emergency', 'planner'])
  })
})
