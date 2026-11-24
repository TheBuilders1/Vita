import { getRecordType } from '@/modules/registry'
import type { AgendaCategory, AgendaEntry, ModuleId } from '@/modules/types'
import type { Member } from '@/types/family'
import type { FamilyRecord } from '@/types/records'
import { addDays, addMonths, diffDays, isIsoDate, isTime } from '@/utils/dates'
import { nextTaskDate, occurrences, taskSeries } from './agenda'
import { accessTo, canRead } from './permissions'
import { fieldText, recordTitle, titleContext, type TitleContext } from './titles'

interface IcsQuery {
  readonly actor: Member
  readonly records: readonly FamilyRecord[]
  readonly members: readonly Member[]
  readonly enabled: readonly ModuleId[]
  readonly visible: readonly AgendaCategory[]
  readonly today: string
  readonly stamp: Date
}

type Series = Parameters<typeof occurrences>[0]
const FREQUENCIES = { daily: 'DAILY', weekly: 'WEEKLY', monthly: 'MONTHLY', yearly: 'YEARLY' } as const
const DAY_NAMES = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const
const LAST_DATE = '9999-12-31'
const MAX_BYTES = 1024 * 1024
export const LEAP_EXPORT_YEARS = 20

export class IcsSizeError extends Error {
  override name = 'IcsSizeError'
}
const field = (record: FamilyRecord, key: string | undefined) => key === undefined ? undefined : record.data[key]
const dateOrEmpty = (value: unknown) => typeof value === 'string' && isIsoDate(value) ? value : undefined
const compact = (date: string) => date.replaceAll('-', '')
const dateValue = (date: string, time: string | undefined) => time === undefined ? compact(date) : `${compact(date)}T${time.replace(':', '')}00`
const property = (name: string, time: string | undefined) => time === undefined ? `${name};VALUE=DATE` : name
const escapeText = (value: string) =>
  // oxlint-disable-next-line no-control-regex -- El texto del calendario no puede incluir caracteres de control.
  value.replaceAll('\\', '\\\\').replace(/\r\n|\r|\n/g, '\\n').replaceAll(';', '\\;').replaceAll(',', '\\,').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')

function foldLine(line: string): string {
  let length = 0
  let folded = ''
  for (const char of line) {
    const code = char.codePointAt(0) ?? 0
    const bytes = code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4
    if (length + bytes > 75) {
      folded += '\r\n '
      length = 1
    }
    folded += char
    length += bytes
  }
  return folded
}

function addDates(lines: string[], name: string, dates: readonly string[], time: string | undefined) {
  for (let i = 0; i < dates.length; i += 50) {
    lines.push(`${property(name, time)}:${dates.slice(i, i + 50).map((date) => dateValue(date, time)).join(',')}`)
  }
}

interface CalendarEvent {
  readonly uid: string
  readonly title: string
  readonly description?: string
  readonly series: Series
  readonly time?: string | undefined
  readonly span?: number
  readonly excluded?: ReadonlySet<string>
}

function leapDates(series: Series, today: string, last: string): string[] {
  const months = LEAP_EXPORT_YEARS * 12
  const exportEnd = (from: string) => Number(from.slice(0, 4)) + LEAP_EXPORT_YEARS > 9999
    ? LAST_DATE : addDays(addMonths(from, months), -1)
  if (last <= exportEnd(series.start)) return occurrences(series, series.start, last)
  const from = last < today ? addDays(addMonths(last, -months), 1) : today > series.start ? today : series.start
  const end = exportEnd(from)
  return occurrences(series, from, end < last ? end : last)
}

function eventLines({ uid, title, description, series, time, span = 0, excluded }: CalendarEvent, stamp: string, today: string): string[] {
  const { start, repeat, until, weekdays, anchor } = series
  const last = until ?? LAST_DATE
  const origin = anchor ?? start
  const leap = repeat === 'yearly' && origin.endsWith('02-29')
  // Los aniversarios pasan a marzo. Las tareas con fecha original se quedan en febrero.
  const explicit = leap && !anchor
  const available = (date: string) => !excluded?.has(date)
  const candidates = explicit ? leapDates(series, today, last).filter(available) : []
  let first = candidates[0]
  if (!explicit) {
    let from = start
    while (from <= last) {
      const through = diffDays(from, last) < 7 ? last : addDays(from, 7)
      const dates = occurrences(series, from, through)
      first = dates.find(available)
      if (first || dates.length === 0 || through === last || repeat === 'none') break
      // Solo las pautas diarias tienen anotaciones por repetición.
      from = addDays(through, 1)
    }
  }
  if (!first) return []
  const lines = ['BEGIN:VEVENT', `UID:${uid}@vita.local`, `DTSTAMP:${stamp}`, `${property('DTSTART', time)}:${dateValue(first, time)}`]
  const duration = span + (time === undefined ? 1 : 0)
  if (duration > 0) {
    if (diffDays(first, LAST_DATE) >= duration) lines.push(`${property('DTEND', time)}:${dateValue(addDays(first, duration), time)}`)
    else lines.push(`DURATION:P${duration}D`)
  }
  lines.push(`SUMMARY:${escapeText(title)}`)
  if (description) lines.push(`DESCRIPTION:${escapeText(description)}`)
  if (explicit) addDates(lines, 'RDATE', candidates.slice(1), time)
  else if (repeat !== 'none') {
    const rule = [`FREQ=${FREQUENCIES[repeat]}`]
    if (repeat === 'daily' && weekdays?.length) rule.push(`BYDAY=${weekdays.map((day) => DAY_NAMES[day - 1]).join(',')}`)
    const day = Number(origin.slice(8))
    if (repeat === 'monthly' && day > 28) {
      const days = Array.from({ length: day - 27 }, (_, index) => 28 + index)
      rule.push(`BYMONTHDAY=${days.join(',')}`, 'BYSETPOS=-1')
    }
    if (leap) rule.push('BYMONTH=2', 'BYMONTHDAY=28,29', 'BYSETPOS=-1')
    if (until) rule.push(`UNTIL=${dateValue(until, time)}`)
    lines.push(`RRULE:${rule.join(';')}`)
    const exceptions = [...(excluded ?? [])].filter((date) => date > first && date <= last && occurrences(series, date, date).length > 0).toSorted()
    addDates(lines, 'EXDATE', exceptions, time)
  }
  return [...lines, 'END:VEVENT']
}

function eventsFor(record: FamilyRecord, entry: AgendaEntry, index: number, records: readonly FamilyRecord[], context: TitleContext, today: string): CalendarEvent[] {
  const start = dateOrEmpty(field(record, entry.dateField))
  const done = getRecordType(record.typeId).doneField
  if (!start || (!entry.independent && field(record, done))) return []
  const end = dateOrEmpty(field(record, entry.endField))
  const frequency = entry.repeat ?? field(record, entry.repeatField)
  const repeat = frequency === 'daily' || frequency === 'weekly' || frequency === 'monthly' || frequency === 'yearly' ? frequency : 'none'
  const rawDays = field(record, entry.weekdaysField)
  const weekdays = Array.isArray(rawDays) ? rawDays.filter((day): day is number => Number.isInteger(day) && day >= 1 && day <= 7) : undefined
  const task = record.typeId === 'task' ? taskSeries(record.data) : undefined
  const series = task ?? { start, repeat, weekdays, until: dateOrEmpty(field(record, entry.untilField)) }
  const rawTimes = field(record, entry.timesField)
  const rawTime = field(record, entry.timeField)
  const times = entry.timesField ? (Array.isArray(rawTimes) ? rawTimes : []) : [rawTime]
  const logs = entry.log
  const logged = logs ? records.filter((r) => r.typeId === logs.typeId && r.data[logs.refField] === record.id) : []
  const title = recordTitle(record, context)
  const detail = entry.detailField ? fieldText(record, entry.detailField, context) : ''
  const description = [entry.label, detail].filter(Boolean).join('\n')
  return [...new Set(times)].flatMap((value) => {
    if (value !== undefined && (typeof value !== 'string' || !isTime(value))) return []
    const time = typeof value === 'string' ? value : undefined
    const excluded = new Set(logged.flatMap(({ data }) => {
      const date = dateOrEmpty(data.date)
      return date && data.time === time ? [date] : []
    }))
    const slot = entry.timesField ? `-${time?.replace(':', '') ?? 'dia'}` : ''
    const event: CalendarEvent = {
      uid: `registro-${encodeURIComponent(record.id)}-${index}${slot}`, title, description, series, time,
      span: end ? Math.max(0, diffDays(start, end)) : 0, excluded,
    }
    if (!task || start >= today) return [event]
    // Una tarea atrasada aparece una vez; las vistas previas se retoman desde hoy.
    const next = nextTaskDate(task, today)
    const pending: CalendarEvent = {
      ...event, uid: `${event.uid}-pendiente-${start}`, series: { start, repeat: 'none' },
    }
    return next ? [pending, { ...event, series: { ...task, start: next } }] : [pending]
  })
}

function birthdays(members: readonly Member[]): CalendarEvent[] {
  return members.flatMap((member) => {
    if (!isIsoDate(member.birthDate) || member.birthDate >= '9999-01-01') return []
    const leap = member.birthDate.endsWith('02-29')
    return [{
      uid: `cumple-${encodeURIComponent(member.id)}`, title: `Cumpleaños de ${member.name}`,
      series: leap
        ? { start: member.birthDate, repeat: 'yearly', until: LAST_DATE }
        : { start: addMonths(member.birthDate, 12), repeat: 'yearly' },
      excluded: new Set([member.birthDate]),
    }]
  })
}

/** Usa los mismos registros y categorías que el calendario. */
export function buildIcs({ actor, records, members, enabled, visible, today, stamp }: IcsQuery): string | null {
  const modules = new Set(enabled.filter((id) => accessTo(actor, id) !== 'none'))
  const filtered = records.filter((r) => modules.has(r.moduleId) && canRead(actor, r))
  const categories = new Set(visible)
  const context = titleContext(members, filtered)
  const timestamp = stamp.toISOString().replace(/[-:]|\.\d{3}/g, '')
  const events = filtered.flatMap((record) => (getRecordType(record.typeId).agenda ?? []).flatMap((entry, index) =>
    categories.has(entry.category) ? eventsFor(record, entry, index, filtered, context, today) : []))
  if (categories.has('birthday') && modules.has('planner')) events.push(...birthdays(members))
  const header = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Vita//Calendario//ES\r\n'
  const footer = 'END:VCALENDAR\r\n'
  const encoder = new TextEncoder()
  let size = header.length + footer.length
  const components: string[] = []
  for (const event of events) {
    const lines = eventLines(event, timestamp, today)
    if (lines.length === 0) continue
    const component = lines.map(foldLine).join('\r\n') + '\r\n'
    size += encoder.encode(component).byteLength
    if (size > MAX_BYTES) throw new IcsSizeError()
    components.push(component)
  }
  return components.length === 0 ? null : header + components.join('') + footer
}
