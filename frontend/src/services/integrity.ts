import type { Field, RecordData } from '@/modules/fields'
import { getRecordType } from '@/modules/registry'
import type { FamilyRecord } from '@/types/records'

/** Lógica pura que mantiene coherentes las referencias entre registros y personas. */
const fieldsOf = (typeId: string): [string, Field][] => Object.entries(getRecordType(typeId).fields)

function idsOfKind(typeId: string, data: RecordData, kinds: readonly Field['kind'][]): string[] {
  const ids = fieldsOf(typeId)
    .filter(([, field]) => kinds.includes(field.kind))
    .flatMap(([name]) => (data[name] ?? []) as string | string[])
  return [...new Set(ids)]
}

export const subjectsOf = (typeId: string, data: RecordData) => idsOfKind(typeId, data, ['member', 'members'])
export const filesOf = (typeId: string, data: RecordData) => idsOfKind(typeId, data, ['files'])

export const referencesOf = (typeId: string, data: RecordData) =>
  fieldsOf(typeId).flatMap(([name, field]) =>
    field.kind === 'record' && data[name] !== undefined ? [{ name, refType: field.refType, id: String(data[name]) }] : [])

/** Una toma o una aportación son de la misma persona que su medicamento u objetivo. */
export const isOfAnother = (data: RecordData, target: FamilyRecord) =>
  data.member !== undefined && target.data.member !== undefined && data.member !== target.data.member

export interface RemovalPlan { removeIds: string[]; updates: FamilyRecord[] }

/** Quita un id de los campos indicados. Devuelve null si el registro deja de ser válido. */
function without(record: FamilyRecord, kinds: readonly Field['kind'][], gone: (id: string) => boolean): FamilyRecord | null {
  const data = { ...record.data }
  let changed = false
  for (const [name, field] of fieldsOf(record.typeId)) {
    if (!kinds.includes(field.kind)) continue
    const value = data[name]
    if (Array.isArray(value)) {
      const kept = value.filter((id) => !gone(String(id)))
      if (kept.length === value.length) continue
      data[name] = kept
      changed = true
    } else if (typeof value === 'string' && gone(value)) {
      delete data[name]
      changed = true
    }
  }
  if (!changed) return record
  const parsed = getRecordType(record.typeId).schema.safeParse(data)
  return parsed.success ? { ...record, data: parsed.data, subjectIds: subjectsOf(record.typeId, parsed.data) } : null
}

interface RemovalRequest { recordId?: string; member?: { id: string; heirId: string } }

/**
 * Calcula todo lo que implica una eliminación: lo que se borra (incluido lo que dependía
 * de ello) y lo que solo pierde una referencia. Sirve para avisar antes y para ejecutar.
 */
export function planRemoval(records: readonly FamilyRecord[], { recordId, member }: RemovalRequest): RemovalPlan {
  const original = new Map(records.map((r) => [r.id, r]))
  const current = new Map(original)
  const removed = new Set<string>()
  const drop = (id: string) => { current.delete(id); removed.add(id) }

  if (recordId !== undefined) drop(recordId)

  if (member) {
    for (const record of records) {
      if (record.visibility === 'private' && record.ownerId === member.id) { drop(record.id); continue }
      const kept = without(record, ['member', 'members'], (id) => id === member.id)
      if (!kept) { drop(record.id); continue }
      const ownerId = kept.ownerId === member.id ? member.heirId : kept.ownerId
      const sharedWith = kept.sharedWith.filter((id) => id !== member.id)
      if (kept !== record || ownerId !== kept.ownerId || sharedWith.length !== kept.sharedWith.length) {
        current.set(record.id, { ...kept, ownerId, sharedWith })
      }
    }
  }

  for (let settled = false; !settled;) {
    settled = true
    for (const record of current.values()) {
      const kept = without(record, ['record'], (id) => removed.has(id))
      if (kept === record) continue
      settled = false
      if (kept) current.set(record.id, kept)
      else drop(record.id)
    }
  }

  return { removeIds: [...removed], updates: [...current.values()].filter((r) => original.get(r.id) !== r) }
}

/** Referencias de registros que se quedan hacia los que se borran. */
export function lostLinks(records: readonly FamilyRecord[], plan: RemovalPlan): { recordId: string; field: string; target: string }[] {
  const removed = new Set(plan.removeIds)
  return records.filter((r) => !removed.has(r.id))
    .flatMap((r) => referencesOf(r.typeId, r.data).filter((ref) => removed.has(ref.id)).map((ref) => ({ recordId: r.id, field: ref.name, target: ref.id })))
}

export const brokenReferences = (record: FamilyRecord, usable: ReadonlyMap<string, FamilyRecord>) =>
  referencesOf(record.typeId, record.data).filter((ref) => {
    const target = usable.get(ref.id)
    return target?.typeId !== ref.refType || isOfAnother(record.data, target)
  }).map((ref) => ref.id)
