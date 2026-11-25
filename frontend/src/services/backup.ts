import * as z from '@/utils/zod'
import { RECORD_TYPES, getRecordType } from '@/modules/registry'
import { familyInputSchema, memberInputSchema, type Family, type Member } from '@/types/family'
import { ACCEPTED_TYPES, CHANGE_KINDS, MAX_FILE_BYTES, type FamilyRecord } from '@/types/records'
import { shortName } from '@/utils/fileName'
import { ConflictError } from './errors'
import { filesOf, referencesOf, subjectsOf } from './integrity'

/** 3: la copia incluye las fotos de los perfiles y quién cambió cada registro. Las versiones 1 y 2 también se pueden recuperar. */
export const BACKUP_VERSION = 3

const id = z.string().regex(/^[\w-]{1,64}$/)
const timestamp = z.iso.datetime()
const stamps = { createdAt: timestamp, updatedAt: timestamp }
const typeIds = new Set(RECORD_TYPES.map((t) => t.id))

const envelopeSchema = z.object({ app: z.literal('vita'), version: z.number() })
const bodySchema = z.object({
  family: z.object({ id, isDemo: z.boolean(), name: z.unknown(), enabledModules: z.unknown(), ...stamps }),
  members: z.array(z.object({ id, order: z.number(), name: z.unknown(), birthDate: z.unknown(), relationship: z.unknown(), photo: z.unknown().optional(), notes: z.unknown().optional(), phone: z.unknown().optional(), role: z.unknown(), needs: z.unknown(), moduleAccess: z.unknown(), ...stamps })).min(1),
  records: z.array(z.object({
    id, typeId: z.string().refine((t) => typeIds.has(t)), ownerId: id, visibility: z.enum(['family', 'restricted', 'private']),
    sharedWith: z.array(id), data: z.record(z.string(), z.unknown()), ...stamps,
    history: z.array(z.object({ by: id, at: timestamp, kind: z.enum(CHANGE_KINDS), fields: z.array(z.string().max(100)).max(200) })).max(1000).optional(),
  })),
  files: z.array(z.object({ id, recordId: id, uploadedBy: z.string(), name: z.string().transform(shortName), mime: z.enum(ACCEPTED_TYPES), createdAt: timestamp, data: z.base64() })),
})

export interface BackupFile { id: string; recordId: string; uploadedBy: string; name: string; mime: string; createdAt: string; data: string }
export interface Backup { app: 'vita'; version: number; exportedAt: string; family: Family; members: Member[]; records: FamilyRecord[]; files: BackupFile[] }
export type BackupContent = Pick<Backup, 'family' | 'members' | 'records' | 'files'>

const DAMAGED = 'La copia está dañada o incompleta. No se ha cambiado nada.'
/** Una copia antigua no deja de valer porque el reloj de este equipo vaya retrasado. */
const ANY_DAY = '9999-12-31'

function check(condition: boolean): asserts condition {
  if (!condition) throw new ConflictError(DAMAGED)
}
const unique = (ids: readonly string[]) => new Set(ids).size === ids.length

function readJson(text: string): unknown {
  try { return JSON.parse(text) } catch { return undefined }
}

/** Valida la copia entera antes de tocar nada. Lo derivado (módulo, protagonistas) se recalcula. */
export function parseBackup(text: string): BackupContent {
  const json = readJson(text)
  const envelope = envelopeSchema.safeParse(json)
  if (!envelope.success) throw new ConflictError('El archivo no es una copia de Vita')
  if (envelope.data.version > BACKUP_VERSION) throw new ConflictError('La copia es de una versión más nueva de Vita')
  check(Number.isInteger(envelope.data.version) && envelope.data.version >= 1)
  const body = bodySchema.safeParse(json)
  check(body.success)
  const { family: rawFamily, members: rawMembers, records: rawRecords, files } = body.data

  const familyInput = familyInputSchema.safeParse({ name: rawFamily.name, enabledModules: rawFamily.enabledModules })
  check(familyInput.success)
  const family: Family = { ...rawFamily, ...familyInput.data }

  const members = rawMembers.map(({ id: memberId, order, createdAt, updatedAt, ...profile }): Member => {
    const parsed = memberInputSchema(ANY_DAY).safeParse(profile)
    check(parsed.success)
    return { ...parsed.data, id: memberId, order, createdAt, updatedAt }
  })
  check(members.some((m) => m.role === 'master'))

  const records = rawRecords.map((raw): FamilyRecord => {
    const type = getRecordType(raw.typeId)
    const parsed = type.schema.safeParse(raw.data)
    check(parsed.success)
    return {
      ...raw, data: parsed.data, moduleId: type.moduleId, subjectIds: subjectsOf(type.id, parsed.data),
      visibility: type.visibility.locked ? type.visibility.default : raw.visibility,
    }
  })

  check(unique(members.map((m) => m.id)) && unique(records.map((r) => r.id)) && unique(files.map((f) => f.id)))
  const people = new Set(members.map((m) => m.id))
  const recordsById = new Map(records.map((r) => [r.id, r]))
  const filesById = new Map(files.map((f) => [f.id, f]))
  for (const r of records) {
    check([r.ownerId, ...r.subjectIds, ...r.sharedWith].every((p) => people.has(p)))
    check(referencesOf(r.typeId, r.data).every((ref) => recordsById.get(ref.id)?.typeId === ref.refType))
    check(filesOf(r.typeId, r.data).every((f) => filesById.get(f)?.recordId === r.id))
  }
  for (const f of files) {
    const owner = recordsById.get(f.recordId)
    check(owner !== undefined && filesOf(owner.typeId, owner.data).includes(f.id))
    check(f.data.length <= Math.ceil(MAX_FILE_BYTES / 3) * 4)
  }
  return { family, members, records, files }
}
