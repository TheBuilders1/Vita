import { Dexie, type EntityTable } from 'dexie'
import type { Family, Member } from '@/types/family'
import type { FamilyRecord, StoredFile } from '@/types/records'
import type { TrashEntry } from '@/types/trash'

/** Preferencias de este dispositivo (sesión simulada, accesibilidad…). */
export interface Setting { key: string; value: unknown }

/** Los datos se guardan sin cifrar en IndexedDB, en este navegador y en ningún otro sitio. */
export class VitaDb extends Dexie {
  families!: EntityTable<Family, 'id'>
  members!: EntityTable<Member, 'id'>
  records!: EntityTable<FamilyRecord, 'id'>
  files!: EntityTable<StoredFile, 'id'>
  settings!: EntityTable<Setting, 'key'>
  trash!: EntityTable<TrashEntry, 'id'>

  constructor(name = 'vita') {
    super(name)
    this.version(1).stores({
      families: 'id',
      members: 'id',
      records: 'id, typeId, moduleId, ownerId, *subjectIds',
      files: 'id, recordId',
      settings: 'key',
    })
    this.version(2).stores({ trash: 'id, deletedAt' })
  }
}
