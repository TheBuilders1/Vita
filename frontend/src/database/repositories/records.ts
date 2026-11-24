import type { RecordData } from '@/modules/fields'
import { getRecordType } from '@/modules/registry'
import type { ModuleId, RecordTypeDef, Visibility } from '@/modules/types'
import { nextTaskDate, taskSeries } from '@/services/agenda'
import { ConflictError, NotFoundError, PermissionError, ValidationError, validationErrorFrom } from '@/services/errors'
import { withChange, withEntry } from '@/services/history'
import { filesOf, isOfAnother, planRemoval, referencesOf, subjectsOf } from '@/services/integrity'
import { canComplete, canCreate, canDelete, canRead, canUpdate } from '@/services/permissions'
import type { Member } from '@/types/family'
import type { FamilyRecord } from '@/types/records'
import { todayIso } from '@/utils/dates'
import { newId } from '@/utils/ids'
import { nextStamp } from '@/utils/stamps'
import { loadActor, type RepositoryContext } from './context'
import { requireUnique } from './unique'
import { applyRemoval, summarize, type RemovalSummary } from './removal'
import { keepInTrash } from './trash'

export interface RecordInput {
  typeId: string; data: RecordData; visibility?: Visibility; sharedWith?: string[]
  /** Registro del que es copia: la verá quien pueda ver el original en ese momento. */
  copyOf?: string
  /** `updatedAt` de lo que se tenía delante: si ya es otro, no se guarda. */
  ifUnchanged?: string
}
export type RecordChanges = Partial<Omit<RecordInput, 'typeId' | 'copyOf'>> 
export type RecordFilter = { typeId: string } | { moduleId: ModuleId }

const GONE = 'Ese registro ya no existe'

const parse = (type: RecordTypeDef, data: RecordData): RecordData => {
  const parsed = type.schema.safeParse(data)
  if (!parsed.success) throw validationErrorFrom(parsed.error.issues)
  return parsed.data
}

const requireUnchanged = (current: FamilyRecord, seen: string | undefined) => {
  if (seen !== undefined && seen !== current.updatedAt) throw new ConflictError('Esta ficha ha cambiado mientras la tenías abierta. Ciérrala y ábrela otra vez para no perder lo que hizo la otra persona.')
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
      if (isOfAnother(record.data, target)) throw new ValidationError({ [ref.name]: 'Es de otra persona' })
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

  const save = async (actor: Member, record: FamilyRecord, isNew = false) => {
    await requirePeople([...record.subjectIds, ...record.sharedWith])
    await requireReferences(actor, record)
    await requireUnique(ctx, actor, record)
    await syncFiles(actor, record)
    await db.records[isNew ? 'add' : 'put'](record)
    return record
  }

  const planFor = async (actorId: string, id: string) => {
    const actor = await loadActor(ctx, actorId)
    if (!canDelete(actor, await requireVisible(actor, id))) throw new PermissionError()
    const records = await db.records.toArray()
    const plan = planRemoval(records, { recordId: id })
    const removed = new Set(plan.removeIds)
    // Se llevaría por delante algo que este perfil ni siquiera ve.
    if (records.some((r) => removed.has(r.id) && !canRead(actor, r))) throw new ConflictError('Alguien más del hogar usa esto y no se puede borrar todavía')
    return { records, plan }
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
        const original = input.copyOf === undefined ? undefined : await requireVisible(actor, input.copyOf)
        if (original) requireUnchanged(original, input.ifUnchanged)
        const timestamp = now().toISOString()
        const record: FamilyRecord = {
          id: newId(), typeId: type.id, moduleId: type.moduleId, ownerId: actor.id, subjectIds,
          visibility: input.visibility ?? original?.visibility ?? type.visibility.default, sharedWith: [...new Set(input.sharedWith ?? original?.sharedWith)],
          data, createdAt: timestamp, updatedAt: timestamp,
        }
        checkVisibility(actor, type, type.visibility.default, record)
        return save(actor, record, true)
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
        requireUnchanged(current, changes.ifUnchanged)
        const type = getRecordType(current.typeId)
        const data = changes.data ? parse(type, changes.data) : current.data
        const next: FamilyRecord = {
          ...current, data, subjectIds: subjectsOf(type.id, data),
          visibility: changes.visibility ?? current.visibility,
          sharedWith: changes.sharedWith ? [...new Set(changes.sharedWith)] : current.sharedWith,
          updatedAt: nextStamp(current.updatedAt, now()),
        }
        checkVisibility(actor, type, current.visibility, next)
        // El resultado también debe ser modificable por quien lo cambia (p. ej. no pasar una toma propia a otra persona).
        if (!canUpdate(actor, next)) throw new PermissionError()
        return save(actor, withChange(current, next, { by: actor.id, at: next.updatedAt }))
      }),

    setDone: async (actorId: string, id: string, done: boolean, expected?: { readonly dueDate: unknown; readonly done: boolean }) => {
      const requireCompletable = async () => {
        const actor = await loadActor(ctx, actorId)
        const current = await requireVisible(actor, id)
        const { doneField } = getRecordType(current.typeId)
        if (!doneField || !canComplete(actor, current)) throw new PermissionError()
        return { actor, current, doneField }
      }
      const changed = 'La tarea ya cambió'
      const action = await write(async () => {
        const { actor, current, doneField: field } = await requireCompletable()
        if (expected && (current.data.dueDate !== expected.dueDate || Boolean(current.data[field]) !== expected.done)) throw new ConflictError(changed)

        const time = now()
        const schedule = done && !current.data[field] && current.typeId === 'task' ? taskSeries(current.data) : undefined
        const nextDate = schedule ? nextTaskDate(schedule, todayIso(time)) : undefined
        const data = { ...current.data, [field]: done && nextDate === undefined }
        if (nextDate) {
          data.dueDate = nextDate
          if (schedule?.anchor) data.repeatAnchor = schedule.anchor
        }
        const updatedAt = nextStamp(current.updatedAt, time)
        const next = withEntry({ ...current, data, updatedAt }, { by: actor.id, at: updatedAt, kind: done ? 'done' : 'pending', fields: [] })
        await db.records.put(next)
        return { previous: current, saved: next, doneField: field, series: schedule }
      })

      const { previous, saved, doneField, series } = action
      const { dueDate, repeat, until, repeatAnchor } = saved.data
      const savedDone = saved.data[doneField]
      let undone = false
      const undo = async () => {
        const restored = await write(async () => {
          const { actor, current } = await requireCompletable()
          const dataNow = current.data
          if (undone || current.updatedAt !== saved.updatedAt || dataNow[doneField] !== savedDone ||
            (series && (dataNow.dueDate !== dueDate || dataNow.repeat !== repeat || dataNow.until !== until || dataNow.repeatAnchor !== repeatAnchor))) {
            throw new ConflictError(changed)
          }
          const data = { ...current.data, [doneField]: previous.data[doneField] }
          if (series) {
            data.dueDate = series.start
            if (previous.data.repeatAnchor === undefined) delete data.repeatAnchor
            else data.repeatAnchor = previous.data.repeatAnchor
          }
          const updatedAt = nextStamp(current.updatedAt, now())
          const next = withEntry({ ...current, data, updatedAt }, { by: actor.id, at: updatedAt, kind: done ? 'pending' : 'done', fields: [] })
          await db.records.put(next)
          return next
        })
        undone = true
        return restored
      }

      // Deshacer solo puede recuperar lo que esta acción cambió.
      return { ...saved, undo }
    },

    previewRemoval: (actorId: string, id: string): Promise<RemovalSummary> =>
      read(async () => {
        return summarize((await planFor(actorId, id)).plan)
      }),

    /** Pasa a la papelera con lo que dependa de él. Devuelve con qué id recuperarlo. */
    remove: (actorId: string, id: string): Promise<string> =>
      db.transaction('rw', db.members, db.records, db.files, db.trash, async () => {
        const { records, plan } = await planFor(actorId, id)
        const entry = await keepInTrash(ctx, id, records, plan)
        await applyRemoval(ctx, actorId, plan)
        return entry
      }),

    /** Sin papelera: para deshacer algo recién apuntado. */
    erase: (actorId: string, id: string): Promise<void> =>
      db.transaction('rw', db.members, db.records, db.files, db.trash, async () => {
        const { records, plan } = await planFor(actorId, id)
        // Si entretanto alguien colgó algo de él, eso no se destruye.
        if (plan.removeIds.length > 1) await keepInTrash(ctx, id, records, plan)
        await applyRemoval(ctx, actorId, plan)
      }),
  }
}
