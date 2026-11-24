import type { RecordData } from '@/modules/fields'
import { getRecordType } from '@/modules/registry'
import type { ModuleId, RecordTypeDef, Visibility } from '@/modules/types'
import { ConflictError, NotFoundError, PermissionError, ValidationError, validationErrorFrom } from '@/services/errors'
import { filesOf, planRemoval, referencesOf, subjectsOf } from '@/services/integrity'
import { canComplete, canCreate, canDelete, canRead, canUpdate } from '@/services/permissions'
import type { Member } from '@/types/family'
import type { FamilyRecord } from '@/types/records'
import { newId } from '@/utils/ids'
import { loadActor, type RepositoryContext } from './context'
import { applyRemoval, summarize, type RemovalSummary } from './removal'

export interface RecordInput { typeId: string; data: RecordData; visibility?: Visibility; sharedWith?: string[] }
export type RecordChanges = Partial<Omit<RecordInput, 'typeId'>>
export type RecordFilter = { typeId: string } | { moduleId: ModuleId }

const GONE = 'Ese registro ya no existe'

const parse = (type: RecordTypeDef, data: RecordData): RecordData => {
  const parsed = type.schema.safeParse(data)
  if (!parsed.success) throw validationErrorFrom(parsed.error.issues)
  return parsed.data
}

const checkVisibility = (actor: Member, type: RecordTypeDef, before: Visibility, next: FamilyRecord) => {
  if (next.visibility === before) return
  if (type.visibility.locked) throw new ConflictError('La visibilidad de este registro no se puede cambiar')
  if (next.visibility === 'private' && next.ownerId !== actor.id) throw new PermissionError('Solo quien lo creó puede hacerlo privado')
}

export function createRecordRepository(ctx: RepositoryContext) {
  const { db, now } = ctx

  const requirePeople = async (ids: readonly string[]) => {
    const found = await db.members.bulkGet([...ids])
    if (found.includes(undefined)) throw new NotFoundError('Esa persona ya no está en el hogar')
  }

  /** Lo que no se puede ver se trata como inexistente, para no revelar que está ahí. */
  const requireVisible = async (actor: Member, id: string) => {
    const record = await db.records.get(id)
    if (!record || !canRead(actor, record)) throw new NotFoundError(GONE)
    return record
  }

  const requireReferences = async (actor: Member, record: FamilyRecord) => {
    for (const ref of referencesOf(record.typeId, record.data)) {
      const target = await db.records.get(ref.id)
      if (!target || target.typeId !== ref.refType || !canRead(actor, target)) {
        throw new ValidationError({ [ref.name]: 'El elemento elegido ya no existe' })
      }
    }
  }

  /** Enlaza los archivos del registro y borra los que haya dejado de usar. */
  const syncFiles = async (actor: Member, record: FamilyRecord) => {
    const wanted = filesOf(record.typeId, record.data)
    for (const file of await db.files.bulkGet(wanted)) {
      const available = file && (file.recordId === record.id || (file.recordId === undefined && file.uploadedBy === actor.id))
      if (!available) throw new NotFoundError('Ese archivo ya no está disponible')
    }
    await db.files.where('recordId').equals(record.id).filter((f) => !wanted.includes(f.id)).delete()
    for (const id of wanted) await db.files.update(id, { recordId: record.id })
  }

  const save = async (actor: Member, record: FamilyRecord) => {
    await requirePeople([...record.subjectIds, ...record.sharedWith])
    await requireReferences(actor, record)
    await syncFiles(actor, record)
    await db.records.put(record)
    return record
  }

  const write = <T>(work: () => Promise<T>) => db.transaction('rw', db.members, db.records, db.files, work)
  const read = <T>(work: () => Promise<T>) => db.transaction('r', db.members, db.records, work)

  return {
    create: (actorId: string, input: RecordInput): Promise<FamilyRecord> =>
      write(async () => {
        const actor = await loadActor(ctx, actorId)
        const type = getRecordType(input.typeId)
        const data = parse(type, input.data)
        const subjectIds = subjectsOf(type.id, data)
        if (!canCreate(actor, type.id, subjectIds)) throw new PermissionError()
        const timestamp = now().toISOString()
        const record: FamilyRecord = {
          id: newId(), typeId: type.id, moduleId: type.moduleId, ownerId: actor.id, subjectIds,
          visibility: input.visibility ?? type.visibility.default, sharedWith: [...new Set(input.sharedWith)],
          data, createdAt: timestamp, updatedAt: timestamp,
        }
        checkVisibility(actor, type, type.visibility.default, record)
        return save(actor, record)
      }),

    get: (actorId: string, id: string): Promise<FamilyRecord | undefined> =>
      read(async () => {
        const actor = await loadActor(ctx, actorId)
        const record = await db.records.get(id)
        return record && canRead(actor, record) ? record : undefined
      }),

    list: (actorId: string, filter?: RecordFilter): Promise<FamilyRecord[]> =>
      read(async () => {
        const actor = await loadActor(ctx, actorId)
        const records = filter ? await db.records.where(filter).toArray() : await db.records.toArray()
        return records.filter((r) => canRead(actor, r))
      }),

    /** `data` sustituye al contenido completo, tal como lo entrega el formulario. */
    update: (actorId: string, id: string, changes: RecordChanges): Promise<FamilyRecord> =>
      write(async () => {
        const actor = await loadActor(ctx, actorId)
        const current = await requireVisible(actor, id)
        if (!canUpdate(actor, current)) throw new PermissionError()
        const type = getRecordType(current.typeId)
        const data = changes.data ? parse(type, changes.data) : current.data
        const next: FamilyRecord = {
          ...current, data, subjectIds: subjectsOf(type.id, data),
          visibility: changes.visibility ?? current.visibility,
          sharedWith: changes.sharedWith ? [...new Set(changes.sharedWith)] : current.sharedWith,
          updatedAt: now().toISOString(),
        }
        checkVisibility(actor, type, current.visibility, next)
        // El resultado también debe ser modificable por quien lo cambia (p. ej. no pasar una toma propia a otra persona).
        if (!canUpdate(actor, next)) throw new PermissionError()
        return save(actor, next)
      }),

    setDone: (actorId: string, id: string, done: boolean): Promise<FamilyRecord> =>
      write(async () => {
        const actor = await loadActor(ctx, actorId)
        const current = await requireVisible(actor, id)
        const { doneField } = getRecordType(current.typeId)
        if (!doneField || !canComplete(actor, current)) throw new PermissionError()
        const next = { ...current, data: { ...current.data, [doneField]: done }, updatedAt: now().toISOString() }
        await db.records.put(next)
        return next
      }),

    previewRemoval: (actorId: string, id: string): Promise<RemovalSummary> =>
      read(async () => {
        await requireVisible(await loadActor(ctx, actorId), id)
        return summarize(planRemoval(await db.records.toArray(), { recordId: id }))
      }),

    remove: (actorId: string, id: string): Promise<void> =>
      write(async () => {
        const actor = await loadActor(ctx, actorId)
        if (!canDelete(actor, await requireVisible(actor, id))) throw new PermissionError()
        await applyRemoval(db, planRemoval(await db.records.toArray(), { recordId: id }))
      }),
  }
}
