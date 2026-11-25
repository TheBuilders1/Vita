import { useMemo, useState, type ReactNode } from 'react'
import { useHome } from '@/app/providers/home'
import type { RecordData } from '@/modules/fields'
import { getRecordType } from '@/modules/registry'
import type { FamilyRecord } from '@/types/records'
import { RecordDetail } from './RecordDetail'
import { RecordFormDialog } from './RecordFormDialog'
import { RecordEditorContext, type RecordEditor } from './editor'

type State = { mode: 'create'; typeId: string; preset: RecordData; copyOf?: FamilyRecord } | { mode: 'detail' | 'edit' | 'directEdit'; id: string } | null

/** Un único sitio para ver, crear y cambiar registros desde cualquier pantalla. */
export function RecordEditorProvider({ children }: { children: ReactNode }) {
  const { records } = useHome()
  const [state, setState] = useState<State>(null)
  const editor = useMemo<RecordEditor>(() => ({
    create: (typeId, preset = {}) => setState({ mode: 'create', typeId, preset }),
    edit: (id) => setState({ mode: 'directEdit', id }),
    open: (id) => setState({ mode: 'detail', id }),
  }), [])
  const close = () => setState(null)
  const record = state && state.mode !== 'create' ? records.find((r) => r.id === state.id) : undefined

  return (
    <RecordEditorContext value={editor}>
      {children}
      {state?.mode === 'create' && <RecordFormDialog key={`new-${state.typeId}`} type={getRecordType(state.typeId)} preset={state.preset} copyOf={state.copyOf} onClose={close} />}
      {(state?.mode === 'edit' || state?.mode === 'directEdit') && record && <RecordFormDialog key={record.id} type={getRecordType(record.typeId)} record={record} onClose={state.mode === 'directEdit' ? close : () => setState({ mode: 'detail', id: record.id })} />}
      {state?.mode === 'detail' && record && <RecordDetail key={record.id} record={record} onClose={close} onEdit={() => setState({ mode: 'edit', id: record.id })} onDuplicate={(preset) => setState({ mode: 'create', typeId: record.typeId, preset, copyOf: record })} />}
    </RecordEditorContext>
  )
}
