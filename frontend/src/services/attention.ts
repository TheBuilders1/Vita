import type { AgendaCategory, ModuleId } from '@/modules/types'
import type { Member } from '@/types/family'
import type { FamilyRecord } from '@/types/records'
import { addDays, diffDays } from '@/utils/dates'
import { buildAgenda, byDateAndTime, type AgendaItem } from './agenda'
import { monthSummary } from './finance'

export const WHEN = ['overdue', 'today', 'tomorrow', 'week', 'soon', 'someday'] as const
export type When = (typeof WHEN)[number]
export interface AttentionItem { readonly id: string; readonly when: When; readonly item: AgendaItem }

/** Con cuántos días de antelación avisa cada cosa. 0 = solo ese día. */
const NOTICE: Record<AgendaCategory, number> = {
  event: 7, appointment: 7, school: 7, holiday: 7, reminder: 7, birthday: 14, deadline: 30, medication: 0, meal: -1,
}
const NOTICE_BY_TYPE: Readonly<Record<string, number>> = { document: 60, foodItem: 3, grant: 21, careRoutine: 0 }

/** Lo que sigue pendiente aunque haya pasado su fecha. Una cita pasada, en cambio, ya pasó. */
const STAYS_PENDING = new Set(['task', 'safetyCheck', 'document', 'foodItem', 'grant', 'vaccine', 'careNeed', 'device', 'socialAccount'])
const LOOK_BACK_DAYS = 3650

function isSettled(record: FamilyRecord, all: readonly FamilyRecord[]): boolean {
  const { data } = record
  switch (record.typeId) {
    case 'grant': return ['submitted', 'granted', 'denied'].includes(String(data.status))
    case 'milestone': return data.achievedDate !== undefined
    case 'booking': return data.status === 'cancelled'
    case 'outing': return data.status === 'done'
    case 'vaccine': return all.some((o) => o.typeId === 'vaccine' && o.id !== record.id && o.data.name === data.name && o.data.member === data.member && String(o.data.givenDate ?? '') >= String(data.nextDate))
    default: return false
  }
}

function whenOf(item: AgendaItem, today: string): When {
  const days = diffDays(today, item.date)
  if (days < 0) return item.endDate && item.endDate >= today ? 'today' : 'overdue'
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  return days <= 7 ? 'week' : 'soon'
}

const noticeOf = (item: AgendaItem): number => NOTICE_BY_TYPE[item.typeId ?? ''] ?? NOTICE[item.category]

export interface AttentionQuery { readonly records: readonly FamilyRecord[]; readonly members: readonly Member[]; readonly today: string }

/** Lo que merece atención, de más a menos urgente. Alimenta el resumen y los indicadores del edificio. */
export function buildAttention({ records, members, today }: AttentionQuery): AttentionItem[] {
  // Los registros resueltos se quitan como origen, pero los demás se conservan: las tomas marcan sus dosis.
  const open = records.filter((r) => !isSettled(r, records))
  const ahead = buildAgenda({ records: open, members, from: today, to: addDays(today, Math.max(...Object.values(NOTICE_BY_TYPE), ...Object.values(NOTICE))) })
  const late = buildAgenda({ records: open.filter((r) => STAYS_PENDING.has(r.typeId)), members: [], from: addDays(today, -LOOK_BACK_DAYS), to: addDays(today, -1) })

  // Que un plazo se abriera es una noticia pasada; que se cerrara sin presentarlo, no.
  const missed = late.filter((item) => item.typeId !== 'grant' || item.category === 'deadline')
  const dated = [...missed, ...ahead]
    .filter((item) => !item.done && diffDays(today, item.date) <= noticeOf(item))
    .map((item) => ({ id: item.key, when: whenOf(item, today), item }))
  const undated = open
    .filter((r) => r.typeId === 'task' && r.data.dueDate === undefined && !r.data.done)
    .map((r): AttentionItem => ({
      id: r.id, when: 'someday',
      item: { key: r.id, recordId: r.id, typeId: r.typeId, moduleId: r.moduleId, date: '', title: String(r.data.title), category: 'reminder', memberIds: r.subjectIds, done: false },
    }))

  return [...dated, ...undated].toSorted((a, b) => WHEN.indexOf(a.when) - WHEN.indexOf(b.when) || byDateAndTime(a.item, b.item))
}

/** Solo lo inmediato: si casi todas las habitaciones tuvieran aviso, ninguno llamaría la atención. */
const IMMEDIATE: readonly When[] = ['overdue', 'today', 'tomorrow']

export function pendingByModule(items: readonly AttentionItem[]): Map<ModuleId, number> {
  const counts = new Map<ModuleId, number>()
  for (const { when, item } of items) if (IMMEDIATE.includes(when)) counts.set(item.moduleId, (counts.get(item.moduleId) ?? 0) + 1)
  return counts
}

/** Gasto registrado en el mes de `day`, en céntimos, contando los que se repiten. */
export const monthExpenses = (records: readonly FamilyRecord[], day: string): number => monthSummary(records, day).expense
