import { getRecordType } from '@/modules/registry'
import type { FamilyRecord } from '@/types/records'

const dateOf = (r: FamilyRecord): string => {
  const type = getRecordType(r.typeId)
  const field = type.agenda?.[0]?.dateField ?? Object.entries(type.fields).find(([, f]) => f.kind === 'date')?.[0]
  return field ? String(r.data[field] ?? '') : ''
}

/** Lo pendiente antes que lo hecho; lo que viene, por cercanía; lo pasado, de más a menos reciente. */
export function byRelevance(today: string) {
  const rank = (r: FamilyRecord) => {
    const { doneField } = getRecordType(r.typeId)
    if (doneField && r.data[doneField]) return 3
    const date = dateOf(r)
    if (!date) return 1
    return date >= today ? 0 : 2
  }
  return (a: FamilyRecord, b: FamilyRecord) => {
    const difference = rank(a) - rank(b)
    if (difference !== 0) return difference
    return rank(a) === 0 ? dateOf(a).localeCompare(dateOf(b)) : dateOf(b).localeCompare(dateOf(a))
  }
}
