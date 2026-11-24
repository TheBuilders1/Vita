import type { FamilyRecord, StoredFile } from './records'

export const TRASH_DAYS = 30

/** Todo lo que se llevó un borrado, para poder devolverlo entero. */
export interface TrashEntry {
  id: string
  deletedAt: string
  /** Lo que se eligió borrar; decide quién lo ve y quién lo recupera. */
  record: FamilyRecord
  /** Lo borrado con él por depender de él. */
  dependents: FamilyRecord[]
  files: StoredFile[]
  /** Enlaces que perdieron otros registros que se quedaron. */
  links: { recordId: string; field: string; target: string }[]
}
