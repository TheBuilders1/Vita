import { BACKUP_VERSION, parseBackup, type Backup } from '@/services/backup'
import { NotFoundError, PermissionError } from '@/services/errors'
import { canManage } from '@/services/permissions'
import { base64ToBlob, blobToBase64 } from '@/utils/base64'
import { todayIso } from '@/utils/dates'
import { loadActor, type RepositoryContext } from './context'
import { SESSION_KEY } from './session'

const KEY = 'last-backup'

export function createBackupRepository(ctx: RepositoryContext) {
  const { db, now } = ctx

  const requireManager = async (actorId: string | null) => {
    const actor = actorId === null ? undefined : await loadActor(ctx, actorId)
    if (!actor || !canManage(actor, 'data')) throw new PermissionError()
  }

  return {
    async lastExport(): Promise<string | null> {
      const value = (await db.settings.get(KEY))?.value
      return typeof value === 'string' ? value : null
    },

    /** Incluye todo, también lo privado de cada persona: la copia no está cifrada. */
    async export(actorId: string): Promise<Backup> {
      const [family, members, records, files] = await db.transaction('r', [db.families, db.members, db.records, db.files], async () => {
        await requireManager(actorId)
        return Promise.all([db.families.toCollection().first(), db.members.toArray(), db.records.toArray(), db.files.toArray()])
      })
      if (!family) throw new NotFoundError('Todavía no hay ningún hogar')
      const attached = files.flatMap((f) => (f.recordId === undefined ? [] : [{ ...f, recordId: f.recordId }]))
      const encoded = await Promise.all(attached.map(async ({ blob, size: _size, ...file }) => ({ ...file, data: await blobToBase64(blob) })))
      await db.settings.put({ key: KEY, value: todayIso(now()) })
      return { app: 'vita', version: BACKUP_VERSION, exportedAt: now().toISOString(), family, members, records, files: encoded }
    },

    /** Sustituye todo por el contenido de la copia, o no cambia nada. */
    async restore(actorId: string | null, text: string): Promise<void> {
      const { family, members, records, files } = parseBackup(text)
      const stored = files.map(({ data, ...file }) => {
        const blob = base64ToBlob(data, file.mime)
        return { ...file, blob, size: blob.size }
      })
      await db.transaction('rw', [db.families, db.members, db.records, db.files, db.trash, db.settings], async () => {
        // Dentro: entretanto otra pestaña puede haber creado un hogar o quitado el permiso.
        if ((await db.families.count()) > 0) await requireManager(actorId)
        await Promise.all([db.families.clear(), db.members.clear(), db.records.clear(), db.files.clear(), db.trash.clear(), db.settings.delete(SESSION_KEY)])
        await db.families.add(family)
        await db.members.bulkAdd(members)
        await db.records.bulkAdd(records)
        await db.files.bulkAdd(stored)
      })
    },
  }
}
