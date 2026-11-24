import type { Field, Ingredient } from '@/modules/fields'
import { getRecordType } from '@/modules/registry'
import type { FamilyRecord } from '@/types/records'
import { WEEKDAYS } from '@/utils/format'
import { fieldText, recordTitle, type TitleContext } from './titles'

export const ingredientText = (i: Ingredient) => [i.quantity?.toLocaleString('es-ES'), i.unit, i.name].filter(Boolean).join(' ')
export const weekdaysText = (days: readonly number[]) => days.map((d) => WEEKDAYS[d - 1]).join(', ')

function valueText(record: FamilyRecord, name: string, field: Field, context: TitleContext): string {
  const value = record.data[name]
  if (value === undefined || value === false || (Array.isArray(value) && value.length === 0)) return ''
  switch (field.kind) {
    case 'ingredients': return (value as Ingredient[]).map((i) => `- ${ingredientText(i)}`).join('\n')
    case 'weekdays': return weekdaysText(value as number[])
    case 'links': return (value as string[]).join('\n')
    default: return fieldText(record, name, context)
  }
}

interface RecordLine { readonly label: string; readonly text: string; /** Va en líneas aparte. */ readonly list: boolean }
const LISTS: ReadonlySet<Field['kind']> = new Set(['ingredients', 'links'])

/** Los datos visibles con contenido, sin repetir el título. */
export function recordLines(record: FamilyRecord, context: TitleContext): RecordLine[] {
  const type = getRecordType(record.typeId)
  const title = recordTitle(record, context)
  return Object.entries(type.fields).flatMap(([name, field]) => {
    if (field.hidden || field.kind === 'files') return []
    const text = valueText(record, name, field, context).trim()
    return text && text !== title ? [{ label: field.label, text, list: LISTS.has(field.kind) }] : []
  })
}

/** Lo que se ve en la ficha, en texto corriente para un mensaje. Los archivos van aparte. */
export function shareText(record: FamilyRecord, context: TitleContext): string {
  const title = recordTitle(record, context)
  const lines = recordLines(record, context).map(({ label, text, list }) => `${label}:${list ? '\n' : ' '}${text}`)
  return lines.length === 0 ? title : `${title}\n\n${lines.join('\n')}`
}
