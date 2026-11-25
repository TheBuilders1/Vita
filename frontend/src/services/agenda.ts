import type { RecordData } from '@/modules/fields'
import { getRecordType } from '@/modules/registry'
import type { AgendaCategory, AgendaEntry, ModuleId } from '@/modules/types'
import type { Member } from '@/types/family'
import type { FamilyRecord } from '@/types/records'
import { addDays, addMonths, ageOn, diffDays, todayIso, weekdayOf } from '@/utils/dates'
import { fieldText, recordTitle, titleContext, type TitleContext } from './titles'

/** El calendario se deriva de los registros y de los perfiles: no guarda nada propio. */
export interface AgendaItem {
  readonly key: string
  readonly recordId?: string
  readonly typeId?: string
  readonly moduleId: ModuleId
  readonly date: string
  readonly endDate?: string
  readonly time?: string
  readonly title: string
  readonly label?: string
  readonly detail?: string
  readonly category: AgendaCategory
  readonly memberIds: readonly string[]
  /** undefined: no es algo que se complete. */
  readonly done?: boolean
  readonly logStatus?: string
  /** Se repite a diario: en vistas resumidas cede el sitio a lo que es propio de ese día. */
  readonly routine?: boolean
  /** Fecha prevista de una tarea cuya primera repetición aún está pendiente. */
  readonly taskPreview?: boolean
}

type Repeat = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
interface Series {
  readonly start: string
  readonly repeat: Repeat
  readonly until?: string | undefined
  readonly weekdays?: readonly number[] | undefined
  readonly anchor?: string | undefined
}

/** Los que nacen un 29 de febrero lo celebran el 1 de marzo los años que no lo tienen. */
function yearlyDate(start: string, year: number): string {
  const date = addMonths(start, (year - Number(start.slice(0, 4))) * 12)
  return start.endsWith('02-29') && !date.endsWith('02-29') ? addDays(date, 1) : date
}

const monthsBetween = (a: string, b: string) =>
  (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + Number(b.slice(5, 7)) - Number(a.slice(5, 7))

export function occurrences({ start, repeat, until, weekdays, anchor }: Series, from: string, to: string): string[] {
  const first = start > from ? start : from
  const last = until !== undefined && until < to ? until : to
  if (first > last) return []
  const dates: string[] = []
  const add = (date: string) => { if (date >= first && date <= last) dates.push(date) }

  if (repeat === 'none') {
    add(start)
  } else if (repeat === 'daily') {
    const count = diffDays(first, last)
    for (let k = 0; k <= count; k++) {
      const day = addDays(first, k)
      if (!weekdays?.length || weekdays.includes(weekdayOf(day))) dates.push(day)
    }
  } else if (repeat === 'weekly') {
    const skip = Math.max(0, Math.ceil(diffDays(start, first) / 7)) * 7
    const count = diffDays(start, last)
    for (let k = skip; k <= count; k += 7) add(addDays(start, k))
  } else if (repeat === 'monthly') {
    const origin = anchor ?? start
    for (let k = monthsBetween(origin, first); k <= monthsBetween(origin, last); k++) add(addMonths(origin, k))
  } else {
    for (let year = Number(first.slice(0, 4)); year <= Number(last.slice(0, 4)); year++) {
      add(anchor ? addMonths(anchor, (year - Number(anchor.slice(0, 4))) * 12) : yearlyDate(start, year))
    }
  }
  return dates
}

const text = (data: RecordData, field: string | undefined) => {
  const value = field === undefined ? undefined : data[field]
  return typeof value === 'string' ? value : undefined
}

export function taskSeries(data: RecordData): Series | undefined {
  const start = text(data, 'dueDate')
  const repeat = data.repeat
  if (!start || (repeat !== 'daily' && repeat !== 'weekly' && repeat !== 'monthly' && repeat !== 'yearly')) return undefined
  const until = text(data, 'until')
  if (repeat === 'daily' || repeat === 'weekly') return { start, repeat, until }

  // Si se cambia la fecha pendiente a otro día, esa fecha pasa a ser el nuevo punto de partida.
  const saved = text(data, 'repeatAnchor')
  const offset = saved === undefined ? 0 : monthsBetween(saved, start)
  const matches = saved !== undefined && (repeat === 'monthly' || offset % 12 === 0) && addMonths(saved, offset) === start
  return { start, repeat, until, anchor: matches ? saved : start }
}

const LAST_DATE = '9999-12-31'

export function nextTaskDate(series: Series, today: string): string | undefined {
  if (series.start >= LAST_DATE) return undefined
  const first = series.start >= today ? addDays(series.start, 1) : today
  const last = first >= '9999-01-01' ? LAST_DATE : addMonths(first, 12)
  return occurrences(series, first, last)[0]
}

function taskDates(start: string, data: RecordData, from: string, to: string, previewFrom: string | undefined): string[] {
  const current = start >= from && start <= to ? [start] : []
  const series = previewFrom && !data.done ? taskSeries(data) : undefined
  if (!series || !previewFrom || start >= to) return current
  const first = previewFrom > from ? previewFrom : from
  return [...current, ...occurrences(series, first, to).filter((date) => date > start)]
}

interface Log { readonly status: string | undefined }
const logKey = (typeId: string, ref: string, date: string, time: string | undefined) => `${typeId}|${ref}|${date}|${time ?? ''}`

function indexLogs(records: readonly FamilyRecord[]): Map<string, Log> {
  const specs = new Map<string, NonNullable<AgendaEntry['log']>>()
  for (const r of records) for (const e of getRecordType(r.typeId).agenda ?? []) if (e.log) specs.set(e.log.typeId, e.log)
  const logs = new Map<string, Log>()
  for (const { typeId, data } of records) {
    const spec = specs.get(typeId)
    if (spec) logs.set(logKey(typeId, String(data[spec.refField]), String(data.date), text(data, 'time')), { status: text(data, spec.statusField) })
  }
  return logs
}

function itemsOf(record: FamilyRecord, entry: AgendaEntry, index: number, from: string, to: string, context: TitleContext, logs: Map<string, Log>, previewFrom: string | undefined): AgendaItem[] {
  const { data } = record
  const type = getRecordType(record.typeId)
  const start = text(data, entry.dateField)
  // Un plan cancelado ya no ocupa el calendario.
  if (!start || data.status === 'cancelled') return []
  const end = text(data, entry.endField)
  const span = end ? diffDays(start, end) : 0
  const repeat = entry.repeat ?? ((text(data, entry.repeatField) ?? 'none') as Repeat)
  const weekdays = entry.weekdaysField ? (data[entry.weekdaysField] as number[] | undefined) : undefined
  const times = entry.timesField ? (data[entry.timesField] as string[]) : [text(data, entry.timeField)]
  const detail = entry.detailField ? fieldText(record, entry.detailField, context) : ''
  const done = type.doneField && !entry.independent ? Boolean(data[type.doneField]) : undefined
  const title = recordTitle(record, context)

  const task = record.typeId === 'task'
  const dates = task
    ? taskDates(start, data, from, to, previewFrom)
    : occurrences({ start, repeat, until: text(data, entry.untilField), weekdays }, addDays(from, -span), to)
  return dates.flatMap((date) =>
    times.map((time): AgendaItem => {
      const log = entry.log ? logs.get(logKey(entry.log.typeId, record.id, date, time)) : undefined
      const taskPreview = task && date !== start
      return {
        key: `${record.id}:${index}:${date}:${time ?? ''}`,
        recordId: record.id, typeId: record.typeId, moduleId: record.moduleId, date, title,
        category: entry.category, memberIds: record.subjectIds,
        ...(span > 0 && { endDate: addDays(date, span) }),
        ...(time !== undefined && { time }),
        ...(entry.repeat === 'daily' && { routine: true }),
        ...(entry.label !== undefined && { label: entry.label }),
        ...(detail && { detail }),
        ...(taskPreview && { taskPreview }),
        ...(done !== undefined && !taskPreview && { done }),
        ...(entry.log && { done: log !== undefined }),
        ...(log?.status !== undefined && { logStatus: log.status }),
      }
    }))
}

function birthdays(members: readonly Member[], from: string, to: string): AgendaItem[] {
  return members.flatMap((m) =>
    occurrences({ start: m.birthDate, repeat: 'yearly' }, from, to)
      .map((date) => ({ date, age: ageOn(m.birthDate, date) }))
      .filter(({ age }) => age > 0)
      .map(({ date, age }): AgendaItem => ({
        key: `birthday:${m.id}:${date}`, moduleId: 'planner', date, category: 'birthday', memberIds: [m.id],
        title: `Cumpleaños de ${m.name}`, label: age === 1 ? '1 año' : `${age} años`,
      })))
}

export const byDateAndTime = (a: AgendaItem, b: AgendaItem) =>
  a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? '') || a.title.localeCompare(b.title, 'es')

export interface AgendaQuery {
  readonly records: readonly FamilyRecord[]
  readonly members: readonly Member[]
  readonly from: string
  readonly to: string
  readonly today?: string
  readonly taskPreviews?: boolean
}

export function buildAgenda({ records, members, from, to, today = todayIso(), taskPreviews = true }: AgendaQuery): AgendaItem[] {
  const context = titleContext(members, records)
  const logs = indexLogs(records)
  const items = records.flatMap((record) =>
    (getRecordType(record.typeId).agenda ?? []).flatMap((entry, index) => itemsOf(record, entry, index, from, to, context, logs, taskPreviews ? today : undefined)))
  return [...items, ...birthdays(members, from, to)].toSorted(byDateAndTime)
}

export const occursOn = (item: AgendaItem, day: string) => item.date <= day && day <= (item.endDate ?? item.date)
