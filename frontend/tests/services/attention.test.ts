import { describe, expect, test } from 'vitest'
import { buildAttention, monthExpenses, pendingByModule } from '@/services/attention'
import { buildMember, buildRecord } from '../support/builders'

const today = '2026-11-24'
let n = 0
const rec = (typeId: string, moduleId: string, data: Record<string, unknown>) => buildRecord({ id: `a${++n}`, typeId, moduleId: moduleId as never, data })
const look = (...records: ReturnType<typeof rec>[]) => buildAttention({ records, members: [], today })
const when = (...records: ReturnType<typeof rec>[]) => look(...records).map((i) => i.when)

describe('cuándo merece atención', () => {
  test.each([['2026-11-23', 'overdue'], ['2026-11-24', 'today'], ['2026-11-25', 'tomorrow'], ['2026-11-30', 'week']])('una tarea para el %s es %s', (dueDate, expected) => {
    expect(when(rec('task', 'planner', { title: 't', dueDate, done: false }))).toEqual([expected])
  })
  test('lo hecho, lo lejano y lo que no tiene fecha no molestan', () => {
    expect(look(
      rec('task', 'planner', { title: 't', dueDate: '2026-11-20', done: true }),
      rec('task', 'planner', { title: 't', dueDate: '2027-03-01', done: false }),
      rec('appointment', 'healthRecord', { title: 'x', date: '2026-11-24', done: true }),
    )).toEqual([])
  })
  test('una tarea sin fecha queda pendiente, al final', () => {
    expect(when(rec('task', 'planner', { title: 't', done: false }))).toEqual(['someday'])
  })
  test('una cita o un evento que ya pasó no está atrasado', () => {
    expect(look(rec('appointment', 'healthRecord', { title: 'x', date: '2026-11-20', done: false }), rec('event', 'planner', { title: 'x', date: '2026-11-20' }))).toEqual([])
  })
  test('cada cosa avisa con su antelación', () => {
    expect(when(rec('document', 'documents', { title: 'DNI', expiryDate: '2027-01-20' }))).toEqual(['soon'])
    expect(look(rec('document', 'documents', { title: 'DNI', expiryDate: '2027-02-20' }))).toEqual([])
    expect(look(rec('foodItem', 'fridge', { name: 'Yogur', expiryDate: '2026-11-29' }))).toEqual([])
    expect(when(rec('foodItem', 'fridge', { name: 'Yogur', expiryDate: '2026-11-25' }))).toEqual(['tomorrow'])
  })
  test('lo caducado sigue avisando', () => {
    expect(when(rec('document', 'documents', { title: 'DNI', expiryDate: '2026-01-01' }))).toEqual(['overdue'])
  })
  test('lo resuelto deja de avisar', () => {
    expect(look(
      rec('grant', 'grants', { title: 'Beca', deadline: '2026-11-25', status: 'submitted' }),
      rec('milestone', 'development', { title: 'Leer', expectedDate: '2026-11-25', achievedDate: '2026-11-01' }),
      rec('booking', 'bookings', { title: 'Museo', date: '2026-11-25', status: 'cancelled' }),
      rec('outing', 'outings', { title: 'Parque', date: '2026-11-25', status: 'done' }),
    )).toEqual([])
  })
  test('de la medicación solo cuenta la de hoy sin registrar', () => {
    const plan = rec('medicationPlan', 'medication', { name: 'A', times: ['09:00', '21:00'], weekdays: [], startDate: '2026-11-01' })
    const log = rec('medicationIntake', 'medication', { plan: plan.id, date: today, time: '09:00', status: 'taken' })
    expect(look(plan, log).map((i) => [i.when, i.item.time])).toEqual([['today', '21:00']])
  })
  test('el menú no ocupa el resumen', () => {
    expect(look(rec('mealPlan', 'cooking', { date: today, meal: 'lunch', dish: 'Sopa' }))).toEqual([])
  })
  test('unas vacaciones en curso son de hoy', () => {
    expect(when(rec('outing', 'outings', { title: 'Viaje', date: '2026-11-20', endDate: '2026-11-28' }))).toEqual(['today'])
  })
})

test('lo urgente va primero', () => {
  expect(when(
    rec('document', 'documents', { title: 'x', expiryDate: '2027-01-10' }),
    rec('task', 'planner', { title: 'x', done: false }),
    rec('appointment', 'healthRecord', { title: 'x', date: '2026-11-25', done: false }),
    rec('event', 'planner', { title: 'x', date: today }),
    rec('task', 'planner', { title: 'x', dueDate: '2026-11-01', done: false }),
  )).toEqual(['overdue', 'today', 'tomorrow', 'soon', 'someday'])
})

test('los cumpleaños avisan dos semanas antes', () => {
  const soon = buildMember('a', 'member', { birthDate: '1980-12-06' })
  const far = buildMember('b', 'member', { birthDate: '1980-12-20' })
  expect(buildAttention({ records: [], members: [soon, far], today }).map((i) => i.when)).toEqual(['soon'])
})

test('el edificio solo señala lo de hoy, mañana y lo atrasado', () => {
  const items = look(
    rec('document', 'documents', { title: 'x', expiryDate: '2026-11-20' }),
    rec('document', 'documents', { title: 'x', expiryDate: '2027-01-10' }),
    rec('appointment', 'healthRecord', { title: 'x', date: '2026-11-25', done: false }),
    rec('task', 'planner', { title: 'x', done: false }),
  )
  expect(Object.fromEntries(pendingByModule(items))).toEqual({ documents: 1, healthRecord: 1 })
})

describe('gastos del mes', () => {
  test('suma gastos sueltos y repetidos del mes, no los ingresos', () => {
    expect(monthExpenses([
      rec('transaction', 'finances', { kind: 'expense', amount: 1000, date: '2026-11-02' }),
      rec('transaction', 'finances', { kind: 'expense', amount: 500, date: '2026-10-31' }),
      rec('transaction', 'finances', { kind: 'income', amount: 9000, date: '2026-11-02' }),
      rec('transaction', 'finances', { kind: 'expense', amount: 70000, date: '2025-01-01', repeat: 'monthly' }),
      rec('transaction', 'finances', { kind: 'expense', amount: 300, date: '2026-11-02', repeat: 'weekly', until: '2026-11-16' }),
      rec('transaction', 'finances', { kind: 'expense', amount: 100, date: '2026-01-01', repeat: 'monthly', until: '2026-06-01' }),
    ], today)).toBe(1000 + 70000 + 900)
  })
})

test('que un plazo se abriera hace días no es un atraso; que se cerrara, sí', () => {
  const grant = { title: 'Beca', status: 'preparing' }
  expect(when(rec('grant', 'grants', { ...grant, openDate: '2026-11-14', deadline: '2027-03-01' }))).toEqual([])
  expect(when(rec('grant', 'grants', { ...grant, openDate: '2026-10-01', deadline: '2026-11-20' }))).toEqual(['overdue'])
})

test.each(['2026-11-19', '2010-11-24', today, '2026-11-25'])('el resumen solo cuenta la tarea del %s y conserva su hora', (dueDate) => {
  const items = look(rec('task', 'planner', { title: 'Regar', dueDate, repeat: 'daily', time: '09:30' }))
  expect(items.map(({ item }) => [item.date, item.time])).toEqual([[dueDate, '09:30']])
  expect(pendingByModule(items).get('planner')).toBe(1)
})
