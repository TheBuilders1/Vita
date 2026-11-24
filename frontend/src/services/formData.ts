import type { Field, RecordData } from '@/modules/fields'
import type { RecordTypeDef } from '@/modules/types'

const EMPTY_LIST: ReadonlySet<Field['kind']> = new Set(['choices', 'members', 'weekdays', 'tags', 'times', 'ingredients', 'files', 'links'])

/** Punto de partida de un alta: hoy en la fecha obligatoria y al menos una línea en las listas obligatorias. */
export function emptyData(type: RecordTypeDef, today: string): RecordData {
  return Object.fromEntries(Object.entries(type.fields).map(([name, field]) => {
    if (field.kind === 'ingredients') return [name, field.required ? [{ name: '' }] : []]
    if (field.kind === 'times') return [name, field.required ? ['09:00'] : []]
    if (EMPTY_LIST.has(field.kind)) return [name, []]
    if (field.kind === 'boolean') return [name, false]
    if (field.kind === 'date' && field.required) return [name, today]
    return [name, undefined]
  }))
}

/** Mensaje de error de un campo, aunque sea una lista con el error dentro. */
export function firstMessage(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  if ('message' in error && typeof error.message === 'string' && error.message) return error.message
  for (const inner of Array.isArray(error) ? error : Object.values(error)) {
    const found = firstMessage(inner)
    if (found) return found
  }
  return undefined
}
