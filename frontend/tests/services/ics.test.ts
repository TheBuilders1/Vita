import { expect, test } from 'vitest'
import { occurrences } from '@/services/agenda'
import { buildIcs } from '@/services/ics'
import { buildMember, buildRecord } from '../support/builders'

const actor = buildMember('perfil', 'master')
const stamp = new Date('2026-11-24T08:09:10.123Z')
const event = (id: string, data: Record<string, unknown>) =>
  buildRecord({ id, typeId: 'event', moduleId: 'planner', data: { title: 'Evento de prueba', date: '2026-11-24', ...data } })
const exportRecords = (records: ReturnType<typeof buildRecord>[], today = '2026-01-01') =>
  buildIcs({ actor, records, members: [], today, enabled: ['planner'], visible: ['event', 'reminder', 'medication'], stamp }) ?? ''
const unfold = (encoded: string) => encoded.replaceAll('\r\n ', '')

test('usa CRLF, escapa texto y pliega sin partir caracteres UTF-8', () => {
  const title = 'á🌱'.repeat(50) + ', pausa; una \\ vuelta\r\nOtra línea'
  const result = exportRecords([event('uno', { title })])
  const lines = result.split('\r\n')
  expect(lines[0]).toBe('BEGIN:VCALENDAR')
  expect(lines.slice(-2)).toEqual(['END:VCALENDAR', ''])
  expect(lines.every((line) => !/[\r\n]/.test(line) && new TextEncoder().encode(line).length <= 75)).toBe(true)
  expect(unfold(result)).toContain('SUMMARY:' + 'á🌱'.repeat(50) + '\\, pausa\\; una \\\\ vuelta\\nOtra línea')
})

test('usa fecha final exclusiva y UID estable aunque cambie el título', () => {
  const result = exportRecords([event('uno', { endDate: '2026-11-26' })])
  expect(result).toContain('DTSTART;VALUE=DATE:20261124\r\nDTEND;VALUE=DATE:20261127\r\n')
  expect(result).toContain('DTSTAMP:20261124T080910Z')
  expect(result.match(/^UID:.+$/m)?.[0]).toBe(exportRecords([event('uno', { title: 'Otro' })]).match(/^UID:.+$/m)?.[0])
})

test('la hora y el último inicio de una serie flotan en la hora local', () => {
  const result = exportRecords([event('uno', { time: '09:30', repeat: 'weekly', until: '2026-12-04' })])
  expect(result).toContain('DTSTART:20261124T093000\r\n')
  expect(result).toContain('RRULE:FREQ=WEEKLY;UNTIL=20261204T093000\r\n')
})

test.each([29, 30, 31])('la regla mensual para el día %i coincide con la agenda durante diez años', (day) => {
  const start = `2026-01-${day}`
  const through = '2035-12-31'
  const result = unfold(exportRecords([event('uno', { date: start, repeat: 'monthly' })]))
  const rule = result.match(/^RRULE:FREQ=MONTHLY;BYMONTHDAY=([\d,]+);BYSETPOS=-1$/m)
  expect(rule).not.toBeNull()
  const candidates = rule?.[1]?.split(',').map(Number) ?? []
  const dates = Array.from({ length: 120 }, (_, index) => {
    const year = 2026 + Math.floor(index / 12)
    const month = index % 12
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
    const selected = Math.max(...candidates.filter((candidate) => candidate <= lastDay))
    return `${year}-${String(month + 1).padStart(2, '0')}-${selected}`
  })
  expect(result).toContain(`DTSTART;VALUE=DATE:202601${day}\r\n`)
  expect(dates).toEqual(occurrences({ start, repeat: 'monthly' }, start, through))
  expect(result).not.toContain('RDATE')
})

test('mantiene el 1 de marzo en años sin 29 de febrero', () => {
  const result = exportRecords([event('uno', { date: '2024-02-29', repeat: 'yearly', until: '2028-03-01' })])
  expect(unfold(result)).toContain('RDATE;VALUE=DATE:20250301,20260301,20270301,20280229\r\n')
})

test('un cumpleaños del 29 de febrero conserva sus próximas veinte fechas', () => {
  const start = '2000-02-29'
  const today = '2026-11-24'
  const profile = buildMember('bisiesto', 'member', { birthDate: start })
  const result = unfold(buildIcs({ actor, records: [], members: [profile], enabled: ['planner'], visible: ['birthday'], today, stamp }) ?? '')
  const dates = result.match(/^(?:DTSTART|RDATE);VALUE=DATE:(.+)$/gm)?.flatMap((line) => line.split(':')[1]?.split(',') ?? [])
  expect(dates).toEqual(occurrences({ start, repeat: 'yearly' }, today, '2046-11-23').map((date) => date.replaceAll('-', '')))
})

test('cien series mensuales y un aniversario bisiesto caben en 32 KiB', () => {
  const monthly = Array.from({ length: 100 }, (_, index) => event(`mes-${index}`, { date: '2026-01-31', time: '09:30', repeat: 'monthly' }))
  const leap = event('bisiesto', { date: '2000-02-29', repeat: 'yearly' })
  expect(new TextEncoder().encode(exportRecords(monthly.slice(0, 1))).byteLength).toBeLessThan(1024)
  const result = exportRecords([...monthly, leap], '2026-11-24')
  expect(result.match(/^BEGIN:VEVENT$/gm)).toHaveLength(101)
  expect(new TextEncoder().encode(result).byteLength).toBeLessThan(32 * 1024)
})

test('rechaza una exportación de más de 1 MiB sin entregar un archivo parcial', () => {
  const events = Array.from({ length: 800 }, (_, index) => event(`cita-${index}`, { title: '🌱'.repeat(350) }))
  expect(() => exportRecords(events)).toThrow(expect.objectContaining({ name: 'IcsSizeError' }))
})

test('descarta lo completado, privado, cerrado o filtrado', () => {
  const records = [
    event('publico', { title: 'Visible' }),
    { ...event('privado', { title: 'Privado' }), ownerId: 'otro', visibility: 'private' as const },
    buildRecord({ typeId: 'task', moduleId: 'planner', data: { title: 'Hecha', dueDate: '2026-11-24', done: true } }),
    buildRecord({ typeId: 'document', moduleId: 'documents', data: { title: 'Cerrado', expiryDate: '2026-11-24' } }),
    buildRecord({ typeId: 'medicationPlan', moduleId: 'medication', data: { name: 'Filtrado', times: ['11:00'], startDate: '2026-11-24' } }),
  ]
  const result = buildIcs({ actor, records, members: [], enabled: ['planner', 'medication'], visible: ['event', 'reminder', 'deadline'], today: '2026-11-24', stamp })
  expect(result?.match(/^SUMMARY:.+$/gm)).toEqual(['SUMMARY:Visible'])
})

test('exporta cada hora de medicación y excluye las tomas anotadas', () => {
  const records = [
    buildRecord({ id: 'plan', typeId: 'medicationPlan', moduleId: 'medication', data: { name: 'Plan de prueba', startDate: '2026-11-23', times: ['09:00', '21:00'], weekdays: [1, 3], endDate: '2026-12-01' } }),
    buildRecord({ typeId: 'medicationIntake', moduleId: 'medication', data: { plan: 'plan', date: '2026-11-23', time: '09:00', status: 'skipped' } }),
  ]
  const result = unfold(buildIcs({ actor, records, members: [], enabled: ['medication'], visible: ['medication'], today: '2026-11-24', stamp }) ?? '')
  expect(result).toContain('DTSTART:20261125T090000')
  expect(result).toContain('DTSTART:20261123T210000')
  expect(result.match(/RRULE:FREQ=DAILY;BYDAY=MO,WE;UNTIL=20261201T(?:09|21)0000/g)).toHaveLength(2)
  expect(result).not.toContain('20261123T090000')
})

test('no hay archivo si lo único visible está completado o filtrado', () => {
  expect(buildIcs({ actor, records: [event('uno', {})], members: [], enabled: ['planner'], visible: ['deadline'], today: '2026-11-24', stamp })).toBeNull()
})

test('la serie de una tarea mantiene su día original después de avanzar a febrero', () => {
  const task = buildRecord({ typeId: 'task', moduleId: 'planner', data: {
    title: 'Tarea mensual', dueDate: '2026-02-28', repeat: 'monthly', repeatAnchor: '2026-01-31', until: '2026-04-29', time: '08:15',
  } })
  const ics = unfold(exportRecords([task]))
  expect(ics).toContain('DTSTART:20260228T081500')
  expect(ics).toContain('RRULE:FREQ=MONTHLY;BYMONTHDAY=28,29,30,31;BYSETPOS=-1;UNTIL=20260429T081500')
  expect(ics).not.toContain('20260131')
  expect(ics).not.toContain('20260430')
})

test('una tarea anual anclada en el 29 usa el 28 de febrero en años no bisiestos', () => {
  const task = buildRecord({ typeId: 'task', moduleId: 'planner', data: {
    title: 'Tarea anual', dueDate: '2026-02-28', repeatAnchor: '2024-02-29', repeat: 'yearly',
  } })
  const result = unfold(exportRecords([task]))
  expect(result).toContain('DTSTART;VALUE=DATE:20260228')
  expect(result).toContain('RRULE:FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=28,29;BYSETPOS=-1')
})

test('una toma intermedia anotada se excluye de la serie sin tocar las otras horas', () => {
  const records = [
    buildRecord({ id: 'plan', typeId: 'medicationPlan', moduleId: 'medication', data: { name: 'Plan de prueba', startDate: '2026-11-23', times: ['09:00', '21:00'] } }),
    buildRecord({ typeId: 'medicationIntake', moduleId: 'medication', data: { plan: 'plan', date: '2026-11-24', time: '09:00', status: 'taken' } }),
  ]
  const result = unfold(buildIcs({ actor, records, members: [], enabled: ['medication'], visible: ['medication'], today: '2026-11-24', stamp }) ?? '')
  expect(result.match(/^EXDATE:.+$/gm)).toEqual(['EXDATE:20261124T090000'])
})

test('la repetición anual de un cumpleaños no incluye el día del nacimiento', () => {
  const profile = buildMember('cumple', 'member', { name: 'Perfil de prueba', birthDate: '2000-01-02' })
  const result = buildIcs({ actor, records: [], members: [profile], enabled: ['planner'], visible: ['birthday'], today: '2026-11-24', stamp })
  expect(result).toContain('DTSTART;VALUE=DATE:20010102')
  expect(result).toContain('RRULE:FREQ=YEARLY')
  expect(result).not.toContain('20000102')
})

test('una tarea atrasada conserva la fecha pendiente y salta los días sin vista previa', () => {
  const task = buildRecord({ typeId: 'task', moduleId: 'planner', data: {
    title: 'Tarea diaria', dueDate: '2026-11-20', repeat: 'daily', until: '2026-11-28',
  } })
  const ics = exportRecords([task], '2026-11-24')
  expect(ics.match(/^DTSTART;VALUE=DATE:.+$/gm)).toEqual([
    'DTSTART;VALUE=DATE:20261120', 'DTSTART;VALUE=DATE:20261124',
  ])
  expect(ics).toContain('RRULE:FREQ=DAILY;UNTIL=20261128')
})
