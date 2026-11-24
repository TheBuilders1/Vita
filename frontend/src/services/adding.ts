import { getModule, getRecordType } from '@/modules/registry'
import type { ModuleId, RecordTypeDef } from '@/modules/types'
import type { Member } from '@/types/family'
import type { FamilyRecord } from '@/types/records'
import { accessTo } from './permissions'

/** En una emergencia lo primero es llamar: sus datos se preparan más abajo. */
const NOT_FIRST: ReadonlySet<ModuleId> = new Set(['emergency'])

/** Lo que depende de otro registro (una aportación, de su objetivo) solo tiene sentido si ya existe alguno. */
export function missingParent(type: RecordTypeDef, records: readonly FamilyRecord[]): RecordTypeDef | undefined {
  for (const field of Object.values(type.fields)) {
    if (field.kind === 'record' && field.required && !records.some((r) => r.typeId === field.refType)) return getRecordType(field.refType)
  }
  return undefined
}

/** Qué puede añadir este perfil nada más entrar en una habitación, en el orden del módulo. */
export function addableTypes(moduleId: ModuleId, actor: Member, records: readonly FamilyRecord[]): RecordTypeDef[] {
  if (NOT_FIRST.has(moduleId)) return []
  const access = accessTo(actor, moduleId)
  return getModule(moduleId).recordTypes.map((t) => getRecordType(t.id))
    .filter((type) => (access === 'write' || (access === 'read' && type.selfLog)) && !missingParent(type, records))
}
