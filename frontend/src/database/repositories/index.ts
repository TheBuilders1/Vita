import type { VitaDb } from '@/database/db'
import { createBackupRepository } from './backup'
import { createFamilyRepository } from './family'
import { createFileRepository } from './files'
import { createRecordRepository } from './records'
import { createSessionRepository } from './session'
import { createSettingsRepository } from './settings'
import { createTipsRepository } from './tips'

export function createRepositories(db: VitaDb, now: () => Date = () => new Date()) {
  const ctx = { db, now }
  return {
    family: createFamilyRepository(ctx),
    records: createRecordRepository(ctx),
    files: createFileRepository(ctx),
    session: createSessionRepository(ctx),
    settings: createSettingsRepository(db),
    tips: createTipsRepository(db),
    backup: createBackupRepository(ctx),
  }
}

export type Repositories = ReturnType<typeof createRepositories>
