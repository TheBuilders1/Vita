import { ValidationError } from '@/services/errors'
import { canRead } from '@/services/permissions'
import { ACCEPTED_TYPES, MAX_FILE_BYTES, type StoredFile } from '@/types/records'
import { resolveType } from '@/utils/fileType'
import { shortName } from '@/utils/fileName'
import { newId } from '@/utils/ids'
import { loadActor, type RepositoryContext } from './context'

const ABANDONED_MS = 24 * 60 * 60 * 1000

export function createFileRepository(ctx: RepositoryContext) {
  const { db, now } = ctx

  const readable = async (actorId: string, id: string): Promise<StoredFile | undefined> => {
    const actor = await loadActor(ctx, actorId)
    const file = await db.files.get(id)
    if (!file) return undefined
    if (file.recordId === undefined) return file.uploadedBy === actor.id ? file : undefined
    const record = await db.records.get(file.recordId)
    return record && canRead(actor, record) ? file : undefined
  }

  return {
    add: async (actorId: string, file: File): Promise<StoredFile> => {
      // Fuera de la transacción: leer el archivo la cerraría.
      const mime = await resolveType(file)
      return db.transaction('rw', db.members, db.files, async () => {
        const actor = await loadActor(ctx, actorId)
        if (!(ACCEPTED_TYPES as readonly string[]).includes(mime)) throw new ValidationError({ files: 'Solo se admiten imágenes (JPG, PNG, WebP, GIF), PDF y texto' })
        if (file.size === 0) throw new ValidationError({ files: 'El archivo está vacío' })
        if (file.size > MAX_FILE_BYTES) throw new ValidationError({ files: `El archivo supera ${MAX_FILE_BYTES / 1024 / 1024} MB` })
        const stored: StoredFile = {
          id: newId(), uploadedBy: actor.id, name: shortName(file.name), mime, size: file.size, blob: file.type === mime ? file : file.slice(0, file.size, mime), createdAt: now().toISOString(),
        }
        await db.files.add(stored)
        return stored
      })
    },

    get: (actorId: string, id: string): Promise<StoredFile | undefined> =>
      db.transaction('r', db.members, db.records, db.files, () => readable(actorId, id)),

    /** Otro igual para un registro duplicado: cada archivo pertenece a un solo registro. */
    copy: (actorId: string, id: string): Promise<StoredFile | undefined> =>
      db.transaction('rw', db.members, db.records, db.files, async () => {
        const source = await readable(actorId, id)
        if (!source) return undefined
        const { recordId: _owner, ...file } = source
        const copy: StoredFile = { ...file, id: newId(), uploadedBy: actorId, createdAt: now().toISOString() }
        await db.files.add(copy)
        return copy
      }),

    /** Borra lo que se subió en un formulario que nunca se guardó. Devuelve cuántos. */
    purgeAbandoned: (): Promise<number> => {
      const limit = new Date(now().getTime() - ABANDONED_MS).toISOString()
      return db.files.filter((f) => f.recordId === undefined && f.createdAt < limit).delete()
    },
  }
}
