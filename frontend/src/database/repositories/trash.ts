import { getRecordType } from '@/modules/registry'
import { ConflictError, NotFoundError, PermissionError } from '@/services/errors'
import { withChange, withEntry } from '@/services/history'
import { brokenReferences, isOfAnother, lostLinks, planRemoval, type RemovalPlan } from '@/services/integrity'
import { canDelete, canErase, canRead } from '@/services/permissions'
import { recordTitle, titleContext } from '@/services/titles'
import type { Member } from '@/types/family'
import type { FamilyRecord } from '@/types/records'
import { TRASH_DAYS, type TrashEntry } from '@/types/trash'
import { newId } from '@/utils/ids'
import { nextStamp } from '@/utils/stamps'
import { loadActor, type RepositoryContext } from './context'
import { requireUnique } from './unique'

const GONE = 'Eso ya no se puede recuperar'

/** Guarda lo que se va a borrar. Dentro de la misma transacción de escritura que lo borra. */
export async function keepInTrash({ db, now }: RepositoryContext, recordId: string, records: readonly FamilyRecord[], plan: RemovalPlan): Promise<string> {
  const removed = new Set(plan.removeIds)
  const files = await db.files.where('recordId').anyOf(plan.removeIds).toArray()
  const entry: TrashEntry = {
    id: newId(), deletedAt: now().toISOString(), files,
    record: records.find((r) => r.id === recordId)!,
    dependents: records.filter((r) => removed.has(r.id) && r.id !== recordId),
    links: lostLinks(records, plan),
  }
  await db.trash.add(entry)
  return entry.id
}

/** Cuando una persona se va, lo borrado sigue las mismas reglas que lo que no: lo privado suyo desaparece y lo demás pasa a quien administra. */
export async function forgetInTrash({ db }: RepositoryContext, member: { id: string; heirId: string }): Promise<void> {
  for (const entry of await db.trash.toArray()) {
    const all = [entry.record, ...entry.dependents]
    const plan = planRemoval(all, { member })
    const gone = new Set(plan.removeIds)
    if (gone.has(entry.record.id)) { await db.trash.delete(entry.id); continue }
    const kept = new Map([...all, ...plan.updates].map((r) => [r.id, r]))
    await db.trash.put({
      ...entry, record: kept.get(entry.record.id)!,
      dependents: entry.dependents.filter((r) => !gone.has(r.id)).map((r) => kept.get(r.id)!),
      files: entry.files.filter((f) => f.recordId !== undefined && !gone.has(f.recordId)),
      links: entry.links.filter((l) => !gone.has(l.target)),
    })
  }
}

export function createTrashRepository(ctx: RepositoryContext) {
  const { db, now } = ctx
  const limit = () => new Date(now().getTime() - TRASH_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const write = <T>(work: () => Promise<T>) => db.transaction('rw', db.members, db.records, db.files, db.trash, work)
  const visibleTo = (actor: Member) => (entry: TrashEntry) => entry.deletedAt >= limit() && canDelete(actor, entry.record) && entry.dependents.every((r) => canRead(actor, r))

  const requireEntry = async (actor: Member, id: string) => {
    const entry = await db.trash.get(id)
    if (!entry || !visibleTo(actor)(entry)) throw new NotFoundError(GONE)
    return entry
  }

  return {
    list: (actorId: string): Promise<TrashEntry[]> =>
      db.transaction('r', db.members, db.trash, async () => {
        const actor = await loadActor(ctx, actorId)
        return (await db.trash.toArray()).filter(visibleTo(actor)).toSorted((a, b) => b.deletedAt.localeCompare(a.deletedAt))
      }),

    restore: (actorId: string, id: string): Promise<FamilyRecord> =>
      write(async () => {
        const actor = await loadActor(ctx, actorId)
        const entry = await requireEntry(actor, id)
        const returning = [entry.record, ...entry.dependents]
        // Lo que ahora no puede ver cuenta como si no estuviera: ni se enlaza ni se nombra.
        const readable = (await db.records.toArray()).filter((r) => canRead(actor, r))
        const usable = new Map([...readable, ...returning].map((r) => [r.id, r]))
        const missing = returning.flatMap((r) => brokenReferences(r, usable))
        if (missing.length > 0) {
          const other = (await db.trash.toArray()).filter(visibleTo(actor)).flatMap((e) => [e.record, ...e.dependents]).find((r) => missing.includes(r.id) && canRead(actor, r))
          const name = other && recordTitle(other, titleContext(await db.members.toArray(), readable))
          throw new ConflictError(name ? `Depende de algo que también se borró. Recupera antes «${name}».` : 'Depende de algo que ya no está disponible, así que no se puede recuperar.')
        }
        for (const r of returning) await requireUnique(ctx, actor, r)
        const at = now().toISOString()
        await db.records.bulkAdd(returning.map((r) => withEntry({ ...r, updatedAt: nextStamp(r.updatedAt, now()) }, { by: actor.id, at, kind: 'restored', fields: [] })))
        await db.files.bulkAdd(entry.files)
        for (const link of entry.links) {
          const holder = await db.records.get(link.recordId)
          // Si entretanto se eligió otra cosa, manda lo último.
          const target = usable.get(link.target)
          if (!holder || !target || holder.data[link.field] !== undefined || isOfAnother(holder.data, target)) continue
          const parsed = getRecordType(holder.typeId).schema.safeParse({ ...holder.data, [link.field]: link.target })
          if (!parsed.success) continue
          const updatedAt = nextStamp(holder.updatedAt, now())
          await db.records.put(withChange(holder, { ...holder, data: parsed.data, updatedAt }, { by: actor.id, at: updatedAt }))
        }
        await db.trash.delete(id)
        return entry.record
      }),

    discard: (actorId: string, id: string): Promise<void> =>
      write(async () => {
        const actor = await loadActor(ctx, actorId)
        if (!canErase(actor, await requireEntry(actor, id))) throw new PermissionError()
        await db.trash.delete(id)
      }),

    empty: (actorId: string): Promise<void> =>
      write(async () => {
        const actor = await loadActor(ctx, actorId)
        const visible = visibleTo(actor)
        await db.trash.filter((e) => visible(e) && canErase(actor, e)).delete()
      }),

    /** Borra de verdad lo que lleva más de 30 días. Devuelve cuántos. */
    purge: (): Promise<number> => db.trash.where('deletedAt').below(limit()).delete(),
  }
}
