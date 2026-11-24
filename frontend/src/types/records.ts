import type { RecordData } from '@/modules/fields'
import type { ModuleId, Visibility } from '@/modules/types'

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
