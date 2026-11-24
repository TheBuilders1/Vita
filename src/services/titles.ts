import { getRecordType } from '@/modules/registry'
import type { Member } from '@/types/family'
import type { FamilyRecord } from '@/types/records'
import { formatDate, formatMoney } from '@/utils/format'

export interface TitleContext {
  readonly members: ReadonlyMap<string, Member>
  readonly records: ReadonlyMap<string, FamilyRecord>
}

/** Nombre legible de un registro, también cuando su título es una persona, una fecha o un importe. */
export function recordTitle(record: FamilyRecord, context: TitleContext): string {
  const type = getRecordType(record.typeId)
  const { data } = record
  const title = fieldText(record, type.titleField, context)
  if (record.typeId === 'mealPlan') {
    const recipe = typeof data.recipe === 'string' ? context.records.get(data.recipe) : undefined
    return `${title}: ${String(data.dish ?? recipe?.data.title ?? 'receta')}`
  }
  // Su título es una persona: sin esto, en una lista solo se leería «Leo».
  if (record.typeId === 'allowance') return `Paga de ${title}`
  if (record.typeId === 'emergencyCard') return `Ficha de ${title}`
  return title
}

/** Valor de un campo tal como lo leería una persona. */
export function fieldText(record: FamilyRecord, name: string, { members, records }: TitleContext): string {
  const field = getRecordType(record.typeId).fields[name]
  const value = record.data[name]
  if (!field || value === undefined) return ''
  switch (field.kind) {
    case 'date': return formatDate(String(value))
    case 'money': return formatMoney(Number(value))
    case 'boolean': return value ? 'Sí' : 'No'
    case 'member': return members.get(String(value))?.name ?? 'Antiguo integrante'
    case 'members': return (value as string[]).map((id) => members.get(id)?.name ?? 'Antiguo integrante').join(', ')
    case 'select': return field.options.find((o) => o.value === value)?.label ?? String(value)
    case 'record': {
      const target = records.get(String(value))
      return target ? recordTitle(target, { members, records }) : ''
    }
    case 'choices': return (value as string[]).map((v) => field.options.find((o) => o.value === v)?.label ?? v).join(', ')
    case 'tags': case 'times': return (value as string[]).join(', ')
    default: return String(value)
  }
}

export const titleContext = (members: readonly Member[], records: readonly FamilyRecord[]): TitleContext => ({
  members: new Map(members.map((m) => [m.id, m])),
  records: new Map(records.map((r) => [r.id, r])),
})
