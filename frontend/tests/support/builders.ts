import type { Member, Role } from '@/types/family'
import type { FamilyRecord } from '@/types/records'

export function buildMember(id: string, role: Role, extra: Partial<Member> = {}): Member {
  return {
    id, role, order: 0, name: id, birthDate: '1980-05-10', relationship: 'Familia', needs: [], moduleAccess: {},
    createdAt: '2026-11-01T10:00:00.000Z', updatedAt: '2026-11-01T10:00:00.000Z', ...extra,
  }
}

export function buildRecord(extra: Partial<FamilyRecord> = {}): FamilyRecord {
  return {
    id: 'r1', typeId: 'task', moduleId: 'planner', ownerId: 'mama', subjectIds: [], visibility: 'family', sharedWith: [],
    data: { title: 'Tarea', members: [], done: false },
    createdAt: '2026-11-01T10:00:00.000Z', updatedAt: '2026-11-01T10:00:00.000Z', ...extra,
  }
}
