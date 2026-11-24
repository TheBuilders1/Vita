import { describe, expect, test } from 'vitest'
import { buildAgenda, occursOn } from '@/services/agenda'
import { buildMember, buildRecord } from '../support/builders'

const members = [buildMember('mama', 'master', { name: 'Marta', birthDate: '1981-12-03' }), buildMember('abuela', 'vulnerable', { name: 'Pilar', birthDate: '1948-02-29' })]
let n = 0
const rec = (typeId: string, moduleId: string, data: Record<string, unknown>, extra = {}) =>
  buildRecord({ id: `r${++n}`, typeId, moduleId: moduleId as never, data, ...extra })
const agenda = (records: ReturnType<typeof rec>[], from: string, to: string) => buildAgenda({ records, members: [], from, to })
const dates = (records: ReturnType<typeof rec>[], from: string, to: string) => agenda(records, from, to).map((i) => i.date)

describe('eventos sueltos', () => {
  test('aparecen con título, hora, categoría y personas', () => {
    const r = rec('appointment', 'healthRecord', { member: 'mama', title: 'Cardiología', date: '2026-11-25', time: '10:30', done: false }, { subjectIds: ['mama'] })
    expect(agenda([r], '2026-11-24', '2026-11-30')).toEqual([{
      key: `${r.id}:0:2026-11-25:10:30`, recordId: r.id, typeId: 'appointment', moduleId: 'healthRecord', date: '2026-11-25', time: '10:30',
      title: 'Cardiología', category: 'appointment', memberIds: ['mama'], done: false,
    }])
  })
  test('fuera del intervalo no aparecen y los extremos cuentan', () => {
    const r = rec('event', 'planner', { title: 'Cena', date: '2026-11-25' })
    expect(dates([r], '2026-11-25', '2026-11-25')).toEqual(['2026-11-25'])
    expect(dates([r], '2026-11-26', '2026-11-30')).toEqual([])
  })
  test('sin fecha no hay agenda', () => {
    expect(agenda([rec('task', 'planner', { title: 'x', members: [], done: false })], '2026-01-01', '2026-12-31')).toEqual([])
  })
  test('lo que dura varios días se ve si se solapa con el intervalo', () => {
    const r = rec('outing', 'outings', { title: 'Vacaciones', date: '2026-07-10', endDate: '2026-07-20' })
    const [item] = agenda([r], '2026-07-18', '2026-07-31')
    expect(item).toMatchObject({ date: '2026-07-10', endDate: '2026-07-20' })
    expect(occursOn(item!, '2026-07-20')).toBe(true)
    expect(occursOn(item!, '2026-07-21')).toBe(false)
  })
  test('la etiqueta explica qué ocurre ese día', () => {
    expect(agenda([rec('document', 'documents', { title: 'DNI de Marta', expiryDate: '2026-12-01' })], '2026-12-01', '2026-12-01')[0])
      .toMatchObject({ title: 'DNI de Marta', label: 'Caduca', category: 'deadline' })
  })
})

describe('repeticiones', () => {
  test('semanal, aunque empezara hace años, y hasta su final', () => {
    const r = rec('event', 'planner', { title: 'Piscina', date: '2020-01-06', repeat: 'weekly', until: '2026-11-30' })
    expect(dates([r], '2026-11-20', '2026-12-31')).toEqual(['2026-11-23', '2026-11-30'])
  })
  test('mensual en día 31 usa el último día de los meses cortos sin perder el 31', () => {
    const r = rec('event', 'planner', { title: 'x', date: '2026-01-31', repeat: 'monthly' })
    expect(dates([r], '2026-02-01', '2026-04-30')).toEqual(['2026-02-28', '2026-03-31', '2026-04-30'])
  })
  test('anual del 29 de febrero pasa al 1 de marzo', () => {
    const r = rec('event', 'planner', { title: 'x', date: '2024-02-29', repeat: 'yearly' })
    expect(dates([r], '2026-01-01', '2028-12-31')).toEqual(['2026-03-01', '2027-03-01', '2028-02-29'])
  })
  test('la medicación sale por cada hora y solo los días marcados', () => {
    const r = rec('medicationPlan', 'medication', { member: 'abuela', name: 'Enalapril', dose: '10 mg', times: ['09:00', '21:00'], weekdays: [1, 3], startDate: '2026-11-01' })
    expect(agenda([r], '2026-11-23', '2026-11-25').map((i) => [i.date, i.time])).toEqual([
      ['2026-11-23', '09:00'], ['2026-11-23', '21:00'], ['2026-11-25', '09:00'], ['2026-11-25', '21:00'],
    ])
  })
  test('el tratamiento respeta inicio y fin', () => {
    const r = rec('medicationPlan', 'medication', { name: 'A', times: ['09:00'], weekdays: [], startDate: '2026-11-24', endDate: '2026-11-25' })
    expect(dates([r], '2026-11-01', '2026-11-30')).toEqual(['2026-11-24', '2026-11-25'])
  })
})

describe('tomas registradas', () => {
  const plan = rec('medicationPlan', 'medication', { name: 'A', dose: '1 comprimido', times: ['09:00', '21:00'], weekdays: [], startDate: '2026-11-01' })
  const log = rec('medicationIntake', 'medication', { plan: plan.id, date: '2026-11-24', time: '09:00', status: 'skipped' })
  test('marcan solo su dosis y conservan si se tomó o no', () => {
    const items = agenda([plan, log], '2026-11-24', '2026-11-24')
    expect(items.map((i) => [i.time, i.done, i.logStatus])).toEqual([['09:00', true, 'skipped'], ['21:00', false, undefined]])
    expect(items[0]).toMatchObject({ detail: '1 comprimido' })
  })
})

describe('cumpleaños', () => {
  test('salen de los perfiles con los años que se cumplen', () => {
    expect(buildAgenda({ records: [], members, from: '2026-12-01', to: '2027-03-02' }).map((i) => [i.date, i.title, i.label])).toEqual([
      ['2026-12-03', 'Cumpleaños de Marta', '45 años'], ['2027-03-01', 'Cumpleaños de Pilar', '79 años'],
    ])
  })
  test('nadie cumple años antes de nacer ni el día en que nace', () => {
    const baby = buildMember('b', 'member', { birthDate: '2026-11-24' })
    expect(buildAgenda({ records: [], members: [baby], from: '2025-01-01', to: '2026-12-31' })).toEqual([])
  })
})

test('se ordena por día y hora, con lo de todo el día primero', () => {
  const r = [rec('event', 'planner', { title: 'b', date: '2026-11-24', time: '09:00' }), rec('event', 'planner', { title: 'c', date: '2026-11-25' }), rec('event', 'planner', { title: 'a', date: '2026-11-24' })]
  expect(agenda(r, '2026-11-24', '2026-11-25').map((i) => i.title)).toEqual(['a', 'b', 'c'])
})
test('el menú dice qué se come', () => {
  const recipe = rec('recipe', 'cooking', { title: 'Lentejas' })
  const plan = rec('mealPlan', 'cooking', { date: '2026-11-24', meal: 'lunch', recipe: recipe.id })
  expect(agenda([recipe, plan], '2026-11-24', '2026-11-24')[0]!.title).toBe('Comida: Lentejas')
})

test('lo que se repite cada día se distingue, para que no tape lo demás', () => {
  const plan = rec('medicationPlan', 'medication', { name: 'A', times: ['09:00'], weekdays: [], startDate: '2026-11-01' })
  const event = rec('event', 'planner', { title: 'Cena', date: '2026-11-24' })
  expect(agenda([plan, event], '2026-11-24', '2026-11-24').map((i) => [i.title, i.routine])).toEqual([['Cena', undefined], ['A', true]])
})

describe('tareas con repetición en el calendario', () => {
  test('solo la fecha pendiente puede completarse y todas conservan la hora', () => {
    const task = rec('task', 'planner', { title: 'Regar', dueDate: '2026-11-20', repeat: 'daily', until: '2026-11-25', time: '09:30' })
    const items = buildAgenda({ records: [task], members: [], from: '2026-11-19', to: '2026-11-26', today: '2026-11-24' })
    expect(items.map(({ date, time, done, taskPreview }) => [date, time, done, taskPreview])).toEqual([
      ['2026-11-20', '09:30', false, undefined],
      ['2026-11-24', '09:30', undefined, true],
      ['2026-11-25', '09:30', undefined, true],
    ])
  })

  test('la última fecha hecha sigue en el calendario sin repeticiones nuevas', () => {
    const task = rec('task', 'planner', { title: 'Regar', dueDate: '2026-11-24', repeat: 'daily', done: true })
    expect(agenda([task], '2026-11-24', '2026-11-30').map(({ date, done }) => [date, done])).toEqual([['2026-11-24', true]])
  })

  test('si había pasado al 28 de febrero, el calendario vuelve a mostrar el 31', () => {
    const task = rec('task', 'planner', { title: 'Revisar', dueDate: '2027-02-28', repeat: 'monthly', repeatAnchor: '2027-01-31' })
    const items = buildAgenda({ records: [task], members: [], from: '2027-02-01', to: '2027-03-31', today: '2027-02-01' })
    expect(items.map(({ date }) => date)).toEqual(['2027-02-28', '2027-03-31'])
  })
})
