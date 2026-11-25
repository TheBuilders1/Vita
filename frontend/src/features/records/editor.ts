import { createContext, use } from 'react'
import type { RecordData } from '@/modules/fields'

export interface RecordEditor {
  /** Abre el formulario de alta; `preset` rellena lo que ya se sabe y `onSaved` avisa al guardarlo. */
  readonly create: (typeId: string, preset?: RecordData, onSaved?: (data: RecordData) => void) => void
  readonly edit: (recordId: string) => void
  readonly open: (recordId: string) => void
}
export const RecordEditorContext = createContext<RecordEditor | null>(null)

export function useRecordEditor(): RecordEditor {
  const editor = use(RecordEditorContext)
  if (!editor) throw new Error('useRecordEditor solo se puede usar dentro de RecordEditorProvider')
  return editor
}
