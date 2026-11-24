import type { RecordData } from '@/modules/fields'
import { getRecordType } from '@/modules/registry'
import type { Member } from '@/types/family'
import type { FamilyRecord } from '@/types/records'
import { canCreate } from './permissions'

/** Una por persona (la ficha) o una anotación de algo que pasó (la toma): repetirlas sería un error. */
const UNIQUE: ReadonlySet<string> = new Set(['emergencyCard', 'medicationIntake', 'careLog'])

export const canDuplicate = (actor: Member, record: FamilyRecord) =>
  !UNIQUE.has(record.typeId) && !getRecordType(record.typeId).uniqueBy && canCreate(actor, record.typeId, record.subjectIds)

/** Lo escrito, pero otra vez pendiente y sin lo que anotó la app. */
export function duplicateData(record: FamilyRecord): RecordData {
  const { fields, doneField } = getRecordType(record.typeId)
  const data = Object.fromEntries(Object.entries(record.data).filter(([name]) => !fields[name]?.hidden))
  if (doneField) data[doneField] = false
  return structuredClone(data)
}
