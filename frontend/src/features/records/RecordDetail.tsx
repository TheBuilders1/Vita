import { Check, Pencil, Trash2, Undo2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useStore } from 'zustand'
import { useHome } from '@/app/providers/home'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog, Dialog } from '@/components/ui/Dialog'
import { Disclaimer } from '@/components/ui/Notice'
import { repositories } from '@/database'
import type { RemovalSummary } from '@/database/repositories/removal'
import type { Field, Ingredient } from '@/modules/fields'
import { getModule, getRecordType } from '@/modules/registry'
import { describeError } from '@/services/errors'
import { SERVER_HOUSEHOLD } from '@/services/homeServer'
import { canComplete, canDelete, canUpdate } from '@/services/permissions'
import { fieldText, recordTitle, titleContext } from '@/services/titles'
import { settingsStore, toastStore } from '@/store'
import type { FamilyRecord } from '@/types/records'
import { WEEKDAYS } from '@/utils/format'
import { moduleLink, telLink } from '@/utils/links'
import { FileViewer } from './FileViewer'
import { VISIBILITY_LABELS } from './labels'
import { LinkItem } from './LinkItem'
import { ScanPanel } from './ScanPanel'

interface RecordDetailProps { record: FamilyRecord; onClose: () => void; onEdit: () => void }

export function RecordDetail({ record, onClose, onEdit }: RecordDetailProps) {
  const { actor, members, records } = useHome()
  const [preview, setPreview] = useState<RemovalSummary>()
  const [error, setError] = useState<string>()
  const household = SERVER_HOUSEHOLD
  const photoReading = useStore(settingsStore, (s) => s.settings.photoReading)
  const type = getRecordType(record.typeId)
  const module = getModule(record.moduleId)
  const context = titleContext(members, records)
  const title = recordTitle(record, context)
  const done = type.doneField ? Boolean(record.data[type.doneField]) : undefined
  const attempt = (work: Promise<unknown>) => work.catch((cause: unknown) => setError(describeError(cause)))

  const remove = async () => {
    await repositories.records.remove(actor.id, record.id)
    toastStore.getState().show(`Eliminado: ${title}`)
    onClose()
  }
  if (preview) {
    return (
      <ConfirmDialog open title={`Eliminar «${title}»`} confirmLabel={`Eliminar ${type.name.toLowerCase()}`} error={error} onClose={() => { setPreview(undefined); setError(undefined) }} onConfirm={() => { void attempt(remove()) }}>
        <p>{removalText(preview)} No se puede deshacer.</p>
      </ConfirmDialog>
    )
  }
  return (
    <Dialog
      open
      wide
      onClose={onClose}
      title={title}
      error={error}
      footer={
        <>
          {canDelete(actor, record) && <Button icon={Trash2} onClick={() => { void attempt(repositories.records.previewRemoval(actor.id, record.id).then(setPreview)) }}>Eliminar</Button>}
          {done !== undefined && canComplete(actor, record) && (
            <Button icon={done ? Undo2 : Check} variant={done ? 'secondary' : 'confirm'} onClick={() => { void attempt(repositories.records.setDone(actor.id, record.id, !done)) }}>{done ? 'Marcar pendiente' : 'Hecho'}</Button>
          )}
          {canUpdate(actor, record) && <Button icon={Pencil} variant="primary" onClick={onEdit}>Cambiar</Button>}
        </>
      }
    >
      <p className="mb-4 text-apagado">{type.name} en <Link to={moduleLink(module.id)} onClick={onClose} className="font-bold underline underline-offset-4">{module.name}</Link></p>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Object.entries(type.fields).filter(([, field]) => !field.hidden).map(([name, field]) => {
          const value = renderValue(field, record.data[name], fieldText(record, name, context))
          return value && <div key={name} className={WIDE.has(field.kind) ? 'sm:col-span-2' : undefined}><dt className="font-bold">{field.label}</dt><dd className="break-words whitespace-pre-line">{value}{name === 'expiryDate' && record.data.scannedDate === record.data[name] && <span className="block text-apagado">Leída de una foto de este documento y confirmada.</span>}</dd></div>
        })}
        <div><dt className="font-bold">Quién puede verlo</dt><dd>{VISIBILITY_LABELS[record.visibility].label}</dd></div>
        <div><dt className="font-bold">Lo añadió</dt><dd>{members.find((m) => m.id === record.ownerId)?.name}</dd></div>
      </dl>
      {record.typeId === 'document' && photoReading && household !== null && canUpdate(actor, record) && (
        <div className="mt-5 grid grid-cols-1 gap-3">{((record.data.files ?? []) as string[]).map((id) => <div key={id}><ScanPanel record={record} fileId={id} household={household} /></div>)}</div>
      )}
      {module.disclaimer && <div className="mt-5"><Disclaimer kind={module.disclaimer} /></div>}
    </Dialog>
  )
}

const WIDE: ReadonlySet<Field['kind']> = new Set(['textarea', 'ingredients', 'files', 'links'])

function renderValue(field: Field, value: unknown, text: string): ReactNode {
  if (value === undefined || (Array.isArray(value) && value.length === 0)) return null
  switch (field.kind) {
    case 'files': return <div className="mt-1 grid grid-cols-1 gap-3">{(value as string[]).map((id) => <FileViewer key={id} id={id} />)}</div>
    case 'links': return <ul className="mt-1 grid grid-cols-1 gap-2">{(value as string[]).map((link) => <li key={link}><LinkItem link={link} /></li>)}</ul>
    case 'weekdays': return (value as number[]).map((d) => WEEKDAYS[d - 1]).join(', ')
    case 'phone': return <a href={telLink(text)} className="font-bold underline underline-offset-4">{text}</a>
    case 'url': return <a href={text} target="_blank" rel="noopener noreferrer" className="font-bold underline underline-offset-4">{text}</a>
    case 'ingredients': return <ul className="list-disc pl-6">{(value as Ingredient[]).map((i, n) => <li key={n}>{[i.quantity?.toLocaleString('es-ES'), i.unit, i.name].filter(Boolean).join(' ')}</li>)}</ul>
    default: return text
  }
}

function removalText({ removed, changed }: RemovalSummary): string {
  const parts = ['Se borrará este registro y sus archivos.']
  if (removed > 1) parts.push(removed === 2 ? 'También otro que depende de él.' : `También otros ${removed - 1} que dependen de él.`)
  if (changed > 0) parts.push(changed === 1 ? 'Otro dejará de estar enlazado.' : `Otros ${changed} dejarán de estar enlazados.`)
  return parts.join(' ')
}
