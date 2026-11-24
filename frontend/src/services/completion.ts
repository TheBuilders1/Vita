import type { RecordData } from '@/modules/fields'
import { getRecordType } from '@/modules/registry'
import type { Member } from '@/types/family'
import type { FamilyRecord } from '@/types/records'
import { formatNear } from '@/utils/format'
import type { AgendaItem } from './agenda'
import { canComplete, canCreate } from './permissions'

/** done: marcar el registro · log: anotar esa repetición (una toma, un cuidado). */
export type Completion = { kind: 'done'; recordId: string } | { kind: 'log'; typeId: string; data: RecordData }

export function completionFor(item: AgendaItem, record: FamilyRecord, actor: Member, today: string): Completion | null {
  if (item.done !== false) return null
  if (record.typeId === 'task' && (record.data.done || (record.data.dueDate ?? '') !== item.date)) return null
  const log = getRecordType(record.typeId).agenda?.find((entry) => entry.log)?.log
  // Una tarea se puede adelantar; una cita o una dosis futura todavía no ha ocurrido.
  if (item.date > today && (log || item.category === 'appointment')) return null

  if (log) {
    const member = String(record.data.member)
    if (!canCreate(actor, log.typeId, [member])) return null
    return {
      kind: 'log', typeId: log.typeId,
      data: { member, [log.refField]: record.id, date: item.date, time: item.time, ...(log.statusField && { [log.statusField]: 'taken' }) },
    }
  }
  return canComplete(actor, record) ? { kind: 'done', recordId: record.id } : null
}

export function completionMessage(title: string, today: string, nextDate?: string): string {
  return `Hecho: ${title}${nextDate ? `. La próxima, ${formatNear(nextDate, today).toLocaleLowerCase('es')}` : ''}`
}
