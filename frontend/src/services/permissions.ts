import { getModule, getRecordType } from '@/modules/registry'
import type { Access, ModuleId } from '@/modules/types'
import type { Member } from '@/types/family'
import type { FamilyRecord } from '@/types/records'

/**
 * Simulación de permisos: ordena quién ve y cambia cada cosa dentro de la app.
 * No protege los datos frente a quien tenga acceso al navegador.
 */
const RANK: Record<Access, number> = { none: 0, read: 1, write: 2 }

export function accessTo(actor: Member, moduleId: ModuleId): Access {
  if (actor.role === 'master') return 'write'
  const module = getModule(moduleId)
  const wanted = actor.moduleAccess[moduleId] ?? module.access[actor.role]
  return RANK[wanted] < RANK[module.minimumAccess] ? module.minimumAccess : wanted
}

const isSelfLogOf = (actor: Member, typeId: string, subjectIds: readonly string[]) =>
  getRecordType(typeId).selfLog && subjectIds.length === 1 && subjectIds[0] === actor.id

export function canRead(actor: Member, record: FamilyRecord): boolean {
  if (accessTo(actor, record.moduleId) === 'none') return false
  if (record.ownerId === actor.id) return true
  switch (record.visibility) {
    case 'family': return true
    case 'restricted': return actor.role === 'master' || record.subjectIds.includes(actor.id) || record.sharedWith.includes(actor.id)
    case 'private': return false
  }
}

export function canCreate(actor: Member, typeId: string, subjectIds: readonly string[]): boolean {
  const access = accessTo(actor, getRecordType(typeId).moduleId)
  return access === 'write' || (access === 'read' && isSelfLogOf(actor, typeId, subjectIds))
}

export function canUpdate(actor: Member, record: FamilyRecord): boolean {
  if (!canRead(actor, record)) return false
  if (actor.role === 'master') return true
  if (record.ownerId !== actor.id) return false
  return accessTo(actor, record.moduleId) === 'write' || isSelfLogOf(actor, record.typeId, record.subjectIds)
}

export const canDelete = canUpdate

export function canComplete(actor: Member, record: FamilyRecord): boolean {
  if (!getRecordType(record.typeId).doneField || !canRead(actor, record)) return false
  return canUpdate(actor, record) || record.subjectIds.length === 0 || record.subjectIds.includes(actor.id)
}

export type ManagedArea = 'family' | 'modules' | 'data'

export function canManage(actor: Member, _area: ManagedArea): boolean {
  return actor.role === 'master'
}
