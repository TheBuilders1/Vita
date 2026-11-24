import type { RecordData } from '@/modules/fields'
import type { ModuleId, Visibility } from '@/modules/types'

export const CHANGE_KINDS = ['changed', 'done', 'pending', 'restored'] as const
/** Quién cambió qué y cuándo. Crear no se apunta: ya están la fecha y quien lo añadió. */
export interface ChangeEntry { by: string; at: string; kind: (typeof CHANGE_KINDS)[number]; fields: string[] }

export interface FamilyRecord<D extends RecordData = RecordData> {
  id: string
  typeId: string
  moduleId: ModuleId
  ownerId: string
  /** Derivado de los campos «member» y «members» del registro. */
  subjectIds: string[]
  visibility: Visibility
  sharedWith: string[]
  data: D
  createdAt: string
  updatedAt: string
  history?: ChangeEntry[]
}

export const MAX_FILE_BYTES = 15 * 1024 * 1024
/** Sin SVG ni HTML: al abrirlos, el navegador podría ejecutar código. */
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'text/plain'] as const

export interface StoredFile {
  id: string
  /** Registro que lo usa; undefined mientras el formulario aún no se ha guardado. */
  recordId?: string
  uploadedBy: string
  name: string
  mime: string
  size: number
  blob: Blob
  createdAt: string
}
