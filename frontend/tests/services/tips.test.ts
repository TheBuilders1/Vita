import { describe, expect, test } from 'vitest'
import { MODULES } from '@/modules/registry'
import { buildTips, type TipQuery } from '@/services/tips'
import { buildMember, buildRecord } from '../support/builders'

const today = '2026-11-24'
let n = 0
const rec = (typeId: string, moduleId: string, data: Record<string, unknown>, extra = {}) => buildRecord({ id: `t${++n}`, typeId, moduleId: moduleId as never, data, ...extra })
const adult = buildMember('ana', 'master', { name: 'Ana', birthDate: '1980-01-01' })
const kid = buildMember('leo', 'member', { name: 'Leo', birthDate: '2017-01-01' })
const contact = rec('emergencyContact', 'emergency', { name: 'x', phone: '112' })
const query = (extra: Partial<TipQuery> = {}): TipQuery => ({ records: [contact], members: [adult], today, enabled: MODULES.map((m) => m.id), lastBackup: today, dismissed: [], ...extra })
const ids = (extra: Partial<TipQuery>) => buildTips(query(extra)).map((t) => t.id.split(':')[0])

test('una casa al día no recibe consejos', () => expect(buildTips(query())).toEqual([]))

describe('reglas', () => {
  test('revisión dental infantil: si hace más de un año y no hay otra prevista', () => {
    expect(ids({ members: [adult, kid] })).toContain('dental')
    const visit = (data: object) => rec('dentalVisit', 'dental', { member: 'leo', title: 'x', kind: 'checkup', ...data })
    expect(ids({ members: [adult, kid], records: [contact, visit({ date: '2026-03-01', done: true })] })).not.toContain('dental')
    expect(ids({ members: [adult, kid], records: [contact, visit({ date: '2026-12-01', done: false })] })).not.toContain('dental')
    expect(ids({ members: [adult, kid], records: [contact, visit({ date: '2025-10-01', done: true })] })).toContain('dental')
  })
  test('documento que caduca en dos meses', () => {
    expect(ids({ records: [contact, rec('document', 'documents', { title: 'DNI', kind: 'id', expiryDate: '2027-01-10' })] })).toContain('document')
    expect(ids({ records: [contact, rec('document', 'documents', { title: 'DNI', kind: 'id', expiryDate: '2027-06-10' })] })).not.toContain('document')
  })
  test('receta para aprovechar lo que caduca, nunca una con aviso grave', () => {
    const food = rec('foodItem', 'fridge', { name: 'Yogur', place: 'fridge', expiryDate: '2026-11-25' })
    const recipe = (allergens: string[]) => rec('recipe', 'cooking', { title: 'Bizcocho', minutes: 5, ingredients: [{ name: 'Yogures' }], allergens })
    const allergy = rec('dietNeed', 'diet', { member: 'ana', title: 'Leche', kind: 'allergy', allergen: 'milk', avoid: [] })
    expect(ids({ records: [contact, food, recipe([])] })).toContain('recipe')
    expect(ids({ records: [contact, food, recipe(['milk']), allergy] })).not.toContain('recipe')
  })
  test('presupuesto casi agotado', () => {
    const budget = rec('budget', 'finances', { category: 'food', limit: 1000 })
    const spend = (amount: number) => rec('transaction', 'finances', { kind: 'expense', concept: 'x', category: 'food', amount, date: '2026-11-02' })
    expect(ids({ records: [contact, budget, spend(900)] })).toContain('budget')
    expect(ids({ records: [contact, budget, spend(890)] })).not.toContain('budget')
  })
  test('medicación de ayer sin anotar', () => {
    const plan = rec('medicationPlan', 'medication', { member: 'ana', name: 'A', dose: '1', times: ['09:00'], weekdays: [], startDate: '2026-11-01' })
    expect(ids({ records: [contact, plan] })).toContain('dose')
    const log = rec('medicationIntake', 'medication', { member: 'ana', plan: plan.id, date: '2026-11-23', time: '09:00', status: 'skipped' })
    expect(ids({ records: [contact, plan, log] })).not.toContain('dose')
  })
  test('actividad escolar mañana', () => {
    expect(ids({ records: [contact, rec('schoolEvent', 'school', { title: 'Examen', member: 'leo', kind: 'exam', date: '2026-11-25' })] })).toContain('school')
  })
  test('familias con un bebé reciben orientación', () => {
    expect(ids({ members: [adult, buildMember('b', 'member', { birthDate: '2026-06-01' })] })).toContain('newParent')
    expect(ids({ members: [buildMember('a', 'master', { birthDate: '1990-01-01', needs: ['newParent'] })] })).toContain('newParent')
  })
  test('emergencias sin preparar', () => {
    expect(ids({ records: [] })).toContain('contacts')
    const abuela = buildMember('p', 'vulnerable', { birthDate: '1948-01-01' })
    expect(ids({ members: [adult, abuela] })).toContain('card')
    expect(ids({ members: [adult, abuela], records: [contact, rec('emergencyCard', 'emergency', { member: 'p' })] })).not.toContain('card')
  })
  test('copia de seguridad: nunca hecha o de hace más de un mes, si hay algo que perder', () => {
    expect(ids({ lastBackup: null })).toContain('backup')
    expect(ids({ lastBackup: '2026-10-20' })).toContain('backup')
    expect(ids({ lastBackup: '2026-10-25' })).not.toContain('backup')
  })
})

test('los consejos de salud y dinero se identifican como orientativos', () => {
  const [tip] = buildTips(query({ members: [adult, kid] })).filter((t) => t.id.startsWith('dental'))
  expect(tip).toMatchObject({ kind: 'health', moduleId: 'dental' })
  expect(tip!.text).toContain('Leo')
})
test('un consejo descartado no vuelve, y una habitación cerrada no aconseja', () => {
  const id = buildTips(query({ members: [adult, kid] })).find((t) => t.id.startsWith('dental'))!.id
  expect(ids({ members: [adult, kid], dismissed: [id] })).not.toContain('dental')
  expect(ids({ members: [adult, kid], enabled: ['planner', 'emergency'] })).not.toContain('dental')
})
test('los identificadores son únicos', () => {
  const tips = buildTips(query({ members: [adult, kid], records: [], lastBackup: null }))
  expect(new Set(tips.map((t) => t.id)).size).toBe(tips.length)
})
