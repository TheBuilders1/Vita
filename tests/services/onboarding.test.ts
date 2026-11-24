import { describe, expect, test } from 'vitest'
import { EMPTY_DRAFT, STEPS, resizeMembers, suggestModules, toSetup, validateStep, type Draft, type DraftMember } from '@/services/onboarding'

const today = '2026-11-24'
const person = (extra: Partial<DraftMember> = {}): DraftMember => ({ name: 'Ana', relationship: 'Madre', birthDate: '1980-01-01', role: 'master', needs: [], ...extra })
const draft = (extra: Partial<Draft> = {}): Draft => ({ ...EMPTY_DRAFT, name: 'Los Robles', members: [person()], ...extra })
const suggested = (d: Draft) => [...suggestModules(d, today).keys()]

test('el asistente sigue los ocho pasos del encargo', () => {
  expect(STEPS.map((s) => s.id)).toEqual(['name', 'count', 'members', 'ages', 'roles', 'needs', 'modules', 'look'])
})

describe('validación por pasos', () => {
  test('cada paso revisa solo lo suyo', () => {
    expect(validateStep(draft({ name: ' ' }), 'name', today)).toEqual({ name: 'Escribe el nombre de la familia' })
    expect(validateStep(draft({ name: ' ' }), 'ages', today)).toEqual({})
  })
  test('señala a la persona con el problema', () => {
    const d = draft({ members: [person(), person({ name: '', relationship: '' })] })
    expect(validateStep(d, 'members', today)).toEqual({ 'members.1.name': 'Escribe el nombre', 'members.1.relationship': 'Indica el parentesco' })
  })
  test('las fechas de nacimiento deben existir y no ser futuras', () => {
    const d = draft({ members: [person({ birthDate: '' }), person({ birthDate: '2026-11-25' })] })
    expect(validateStep(d, 'ages', today)).toEqual({ 'members.0.birthDate': 'La fecha de nacimiento no es válida', 'members.1.birthDate': 'La fecha de nacimiento no puede ser futura' })
  })
  test('hace falta al menos un máster', () => {
    expect(validateStep(draft({ members: [person({ role: 'member' })] }), 'roles', today)).toEqual({ roles: 'Elige al menos un máster: es quien administra la familia' })
  })
})

describe('número de integrantes', () => {
  test('ampliar conserva lo escrito y reducir quita los últimos', () => {
    const two = resizeMembers([person()], 2)
    expect(two).toHaveLength(2)
    expect(two[0]).toEqual(person())
    expect(two[1]).toMatchObject({ name: '', role: 'member' })
    expect(resizeMembers(two, 1)).toEqual([person()])
  })
  test('entre una y doce personas', () => {
    expect(resizeMembers([], 0)).toHaveLength(1)
    expect(resizeMembers([], 99)).toHaveLength(12)
  })
  test('la primera persona es máster', () => expect(resizeMembers([], 1)[0]!.role).toBe('master'))
})

describe('bloques sugeridos', () => {
  test('sin niños, mascotas ni cuidados no aparecen sus bloques', () => {
    const modules = suggested(draft())
    for (const id of ['school', 'development', 'kidsMoney', 'pets', 'care', 'diet']) expect(modules).not.toContain(id)
    for (const id of ['cooking', 'medication', 'emergency', 'finances', 'album']) expect(modules).toContain(id)
  })
  test('con niños se activan educación y desarrollo', () => {
    const modules = suggested(draft({ members: [person(), person({ birthDate: '2017-05-01', role: 'member' })] }))
    expect(modules).toEqual(expect.arrayContaining(['school', 'grants', 'bookings', 'development', 'kidsMoney']))
  })
  test('con un bebé hay desarrollo, pero todavía no paga ni colegio', () => {
    const modules = suggested(draft({ members: [person(), person({ birthDate: '2026-03-01', role: 'member' })] }))
    expect(modules).toContain('development')
    expect(modules).not.toContain('kidsMoney')
    expect(modules).not.toContain('school')
  })
  test('mascotas, dependencia e intolerancias activan lo suyo', () => {
    expect(suggested(draft({ hasPets: true }))).toContain('pets')
    expect(suggested(draft({ members: [person(), person({ needs: ['dependency'] })] }))).toContain('care')
    expect(suggested(draft({ members: [person(), person({ role: 'vulnerable' })] }))).toContain('care')
    expect(suggested(draft({ members: [person({ needs: ['intolerance'] })] }))).toContain('diet')
  })
  test('cada sugerencia condicionada explica su motivo', () => {
    expect(suggestModules(draft({ hasPets: true }), today).get('pets')).toBe('Porque tenéis mascotas')
  })
})

test('el resultado es una familia válida con los bloques elegidos', () => {
  const setup = toSetup(draft({ modules: ['pets'] }), today)
  expect(setup.family).toEqual({ name: 'Los Robles', enabledModules: ['pets'] })
  expect(setup.members).toEqual([person()])
})
test('si no se tocaron los bloques se usan los sugeridos', () => {
  expect(toSetup(draft({ hasPets: true }), today).family.enabledModules).toContain('pets')
})
