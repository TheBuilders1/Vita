import type { VitaDb } from '@/database/db'

const KEY = 'dismissed-tips'

/** Consejos descartados en este dispositivo. */
export function createTipsRepository(db: VitaDb) {
  const dismissed = async (): Promise<string[]> => {
    const value = (await db.settings.get(KEY))?.value
    return Array.isArray(value) ? value.filter((v) => typeof v === 'string') : []
  }
  return {
    dismissed,
    dismiss: (id: string): Promise<void> =>
      db.transaction('rw', db.settings, async () => {
        await db.settings.put({ key: KEY, value: [...new Set([...(await dismissed()), id])] })
      }),
    restore: async (): Promise<void> => { await db.settings.delete(KEY) },
  }
}
