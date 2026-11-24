import type { Field } from '@/modules/fields'
import { getRecordType } from '@/modules/registry'
import type { Member } from '@/types/family'
import type { ChangeEntry, FamilyRecord } from '@/types/records'

/** De sobra para años de uso; sin tope, una tarea diaria crecería sin fin. */
const MAX = 200
const ACCESS = '@access'

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

export const withEntry = (record: FamilyRecord, entry: ChangeEntry): FamilyRecord =>
  ({ ...record, history: [...(record.history ?? []), entry].slice(-MAX) })

/** Apunta quién cambió qué. Solo nombres de campos: los valores antiguos no se guardan. */
export function withChange(before: FamilyRecord, after: FamilyRecord, who: Pick<ChangeEntry, 'by' | 'at'>): FamilyRecord {
  const { fields, doneField } = getRecordType(after.typeId)
  const changed = Object.entries(fields).filter(([name, f]) => !f.hidden && name !== doneField && !same(before.data[name], after.data[name])).map(([name]) => name)
  if (before.visibility !== after.visibility || !same(before.sharedWith, after.sharedWith)) changed.push(ACCESS)
  const done = doneField && Boolean(before.data[doneField]) !== Boolean(after.data[doneField]) ? (after.data[doneField] ? 'done' : 'pending') : undefined
  if (changed.length === 0) return done ? withEntry(after, { ...who, kind: done, fields: [] }) : after
  return withEntry(after, { ...who, kind: 'changed', fields: done && doneField ? [...changed, doneField] : changed })
}

const list = new Intl.ListFormat('es-ES', { type: 'conjunction' })
const label = (fields: Readonly<Record<string, Field>>, name: string) => (name === ACCESS ? 'quién puede verlo' : fields[name]?.label)

export interface HistoryLine { readonly at: string; readonly text: string }

export function historyLines(record: FamilyRecord, members: readonly Member[]): HistoryLine[] {
  const { fields } = getRecordType(record.typeId)
  return (record.history ?? []).toReversed().map(({ by, at, kind, fields: names }) => {
    const who = members.find((m) => m.id === by)?.name ?? 'Antiguo integrante'
    const known = names.flatMap((n) => label(fields, n) ?? [])
    const what = kind === 'done' ? 'lo marcó como hecho' : kind === 'pending' ? 'lo marcó como pendiente' : kind === 'restored' ? 'lo recuperó de la papelera'
      : known.length > 0 ? `cambió ${list.format(known)}` : 'lo cambió'
    return { at, text: `${who} ${what}` }
  })
}
