import { describe, expect, test } from 'vitest'
import { EMPTY_DRAFT, firstInvalidStep, hasProgress, resizeMembers, resolveStep, restoreDraft, suggestModules, toSetup, validateStep, visibleSteps, type Draft, type DraftMember } from '@/services/onboarding'

const today = '2026-11-24'
const person = (extra: Partial<DraftMember> = {}): DraftMember => ({ name: 'Ana', relationship: 'Madre', birthDate: '1980-01-01', role: 'master', needs: [], ...extra })
const draft = (extra: Partial<Draft> = {}): Draft => ({ ...EMPTY_DRAFT, name: 'Los Robles', members: [person()], ...extra })
const suggested = (d: Draft) => [...suggestModules(d, today).keys()]

const blank = (): DraftMember => resizeMembers([], 2)[1]!
const ids = (d: Draft) => visibleSteps(d).map((s) => s.id)

describe('pasos', () => {
  test('lo imprescindible son dos: el hogar y quién eres', () => expect(ids(EMPTY_DRAFT)).toEqual(['name', 'you']))
  test('se empieza con una sola persona', () => expect(EMPTY_DRAFT.members).toHaveLength(1))
  test('con detalles siguen los ocho pasos del encargo', () => {
    expect(ids(draft({ detailed: true, members: [person(), person()] }))).toEqual(['name', 'you', 'count', 'members', 'roles', 'ages', 'needs', 'modules', 'look'])
  })
  test('quien vive solo no repasa a los demás', () => {
    expect(ids(draft({ detailed: true }))).toEqual(['name', 'you', 'count', 'needs', 'modules', 'look'])
  })
})

describe('retomar el asistente', () => {
  const detailed = draft({ detailed: true, members: [person(), person({ name: 'Leo', role: 'member' })] })
  test('se vuelve al paso pedido si lo anterior está bien', () => {
    expect(resolveStep(detailed, 'roles', today)).toBe('roles')
    expect(resolveStep(draft(), 'you', today)).toBe('you')
  })
  test('el paso pedido puede estar a medias', () => expect(resolveStep(draft({ members: [person({ name: '' })] }), 'you', today)).toBe('you'))
  test('no deja saltarse un paso sin completar', () => {
    expect(resolveStep(EMPTY_DRAFT, 'you', today)).toBe('name')
    expect(resolveStep({ ...detailed, members: [person(), person({ name: '' })] }, 'look', today)).toBe('members')
  })
  test.each([null, '', 'inventado'])('%j empieza por el principio', (step) => expect(resolveStep(draft(), step, today)).toBe('name'))
  test('un paso que ya no toca lleva al principio', () => expect(resolveStep(draft(), 'roles', today)).toBe('name'))
  test('hay algo que retomar en cuanto se escribe', () => {
    expect(hasProgress(EMPTY_DRAFT)).toBe(false)
    expect(hasProgress({ ...EMPTY_DRAFT, name: '  ' })).toBe(false)
    expect(hasProgress({ ...EMPTY_DRAFT, name: 'Los Robles' })).toBe(true)
    expect(hasProgress({ ...EMPTY_DRAFT, members: [person({ name: 'Ana' })] })).toBe(true)
  })
})

describe('borrador guardado', () => {
  test('se recupera entero', () => {
    const d = draft({ detailed: true, hasPets: true, modules: ['pets'] })
    expect(restoreDraft(JSON.stringify(d))).toEqual(d)
  })
  test('uno anterior, sin los campos nuevos, se completa', () => {
    expect(restoreDraft(JSON.stringify({ name: 'Los Robles', members: [person()] }))).toEqual(draft())
  })
  test.each([null, '', 'no es json', 'null', '7', '[]', '{"members":"x"}', '{"members":[]}', '{"members":[null]}', '{"members":[{"name":7}]}', '{"name":7}'])('%j no rompe el asistente', (raw) => {
    expect(restoreDraft(raw)).toEqual(EMPTY_DRAFT)
  })
})

describe('entrar en casa', () => {
  test('basta con el hogar y quien lo crea, que lo administra', () => {
    expect(firstInvalidStep(draft(), today)).toBeNull()
    expect(toSetup(draft(), today).members).toEqual([person()])
  })
  test('se descartan las personas añadidas sin escribir nada', () => {
    const d = draft({ members: [person(), blank(), blank()] })
    expect(firstInvalidStep(d, today)).toBeNull()
    expect(toSetup(d, today).members).toEqual([person()])
  })
  test('lo escrito a medias no se pierde: se lleva a completarlo', () => {
    expect(firstInvalidStep(draft({ members: [person(), { ...blank(), name: 'Leo' }] }), today)).toBe('members')
    expect(firstInvalidStep(draft({ members: [person(), { ...blank(), name: 'Leo', relationship: 'Hijo' }] }), today)).toBe('ages')
  })
  test('sin máster no se entra', () => expect(firstInvalidStep(draft({ members: [person({ role: 'member' }), person({ role: 'member' })] }), today)).toBe('roles'))
  test('quien se queda solo administra, aunque antes hubiera cedido el mando', () => {
    const d = draft({ members: [person({ role: 'member' }), blank()] })
    expect(firstInvalidStep(d, today)).toBeNull()
    expect(toSetup(d, today).members).toEqual([person()])
  })
  test('lo primero que falta es lo primero que se pide', () => {
    expect(firstInvalidStep(EMPTY_DRAFT, today)).toBe('name')
    expect(firstInvalidStep(draft({ members: [person({ birthDate: '' })] }), today)).toBe('you')
  })
})

describe('validación por pasos', () => {
  test('cada paso revisa solo lo suyo', () => {
    expect(validateStep(draft({ name: ' ' }), 'name', today)).toEqual({ name: 'Escribe el nombre del hogar' })
    expect(validateStep(draft({ name: ' ' }), 'ages', today)).toEqual({})
  })
  test('señala a la persona con el problema', () => {
    const d = draft({ members: [person(), person({ name: '', relationship: '' })] })
    expect(validateStep(d, 'members', today)).toEqual({ 'members.1.name': 'Escribe el nombre', 'members.1.relationship': 'Indica el parentesco' })
  })
  test('las fechas de nacimiento deben existir y no ser futuras', () => {
    const d = draft({ members: [person({ birthDate: '' }), person({ birthDate: '2026-11-25' })] })
    expect(validateStep(d, 'you', today)).toEqual({ 'members.0.birthDate': 'La fecha de nacimiento no es válida' })
    expect(validateStep(d, 'ages', today)).toEqual({ 'members.1.birthDate': 'La fecha de nacimiento no puede ser futura' })
  })
  test('«quién eres» reúne tus tres datos y no los de los demás', () => {
    const d = draft({ members: [person({ name: '', relationship: '', birthDate: '' }), person({ name: '' })] })
    expect(Object.keys(validateStep(d, 'you', today)).toSorted()).toEqual(['members.0.birthDate', 'members.0.name', 'members.0.relationship'])
    expect(Object.keys(validateStep(d, 'members', today))).toEqual(['members.1.name'])
  })
  test('hace falta al menos un máster', () => {
    expect(validateStep(draft({ members: [person({ role: 'member' })] }), 'roles', today)).toEqual({ roles: 'Elige al menos un admin: es quien administra el hogar' })
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
