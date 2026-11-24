import { describe, expect, test } from 'vitest'
import { completionFor } from '@/services/completion'
import { buildAgenda } from '@/services/agenda'
import { buildMember, buildRecord } from '../support/builders'

const today = '2026-11-24'
const master = buildMember('mama', 'master')
const pilar = buildMember('abuela', 'vulnerable')
const other = buildMember('tia', 'member')
const appointment = (date: string) => buildRecord({ id: 'c', typeId: 'appointment', moduleId: 'healthRecord', data: { title: 'x', member: 'abuela', date, done: false }, subjectIds: ['abuela'], visibility: 'restricted' })
const plan = buildRecord({ id: 'p', typeId: 'medicationPlan', moduleId: 'medication', data: { member: 'abuela', name: 'A', dose: '1', times: ['09:00'], weekdays: [], startDate: '2026-11-01' }, subjectIds: ['abuela'], visibility: 'restricted' })
const look = (record: ReturnType<typeof buildRecord>, actor = master, day = today) => {
  const [item] = buildAgenda({ records: [record], members: [], from: day, to: day })
  return completionFor(item!, record, actor, today)
}

describe('qué se puede dar por hecho', () => {
  test('una cita de hoy o pasada, pero no una futura', () => {
    expect(look(appointment(today))).toEqual({ kind: 'done', recordId: 'c' })
    expect(look(appointment('2026-11-25'), master, '2026-11-25')).toBeNull()
  })
  test('una tarea se puede adelantar', () => {
    const task = buildRecord({ data: { title: 't', members: [], dueDate: '2026-11-30', done: false } })
    expect(look(task, master, '2026-11-30')).toEqual({ kind: 'done', recordId: 'r1' })
  })
  test('lo ya hecho no se ofrece', () => {
    expect(look(buildRecord({ data: { title: 't', members: [], dueDate: today, done: true } }))).toBeNull()
  })
  test('una dosis de hoy genera su anotación; la de mañana no se puede anotar', () => {
    expect(look(plan, pilar)).toEqual({ kind: 'log', typeId: 'medicationIntake', data: { member: 'abuela', plan: 'p', date: today, time: '09:00', status: 'taken' } })
    expect(look(plan, pilar, '2026-11-25')).toBeNull()
  })
  test('nadie anota o completa lo que no le corresponde', () => {
    expect(look(plan, buildMember('x', 'vulnerable'))).toBeNull()
    expect(look(appointment(today), other)).toBeNull()
  })
})
