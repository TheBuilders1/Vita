import { Check, CopyPlus, Pencil, Printer, Share2, Trash2, Undo2 } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useStore } from 'zustand'
import { useHome } from '@/app/providers/home'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog, Dialog } from '@/components/ui/Dialog'
import { PrintSheet } from '@/components/print/PrintSheet'
import { ListenButton } from '@/components/ui/ListenButton'
import { Disclaimer } from '@/components/ui/Notice'
import { repositories } from '@/database'
import type { RemovalSummary } from '@/database/repositories/removal'
import { useCompletion, type CompletionNotice } from '@/hooks/useCompletion'
import type { Field, Ingredient, RecordData } from '@/modules/fields'
import { getModule, getRecordType } from '@/modules/registry'
import { canDuplicate, duplicateData } from '@/services/duplicate'
import { describeError } from '@/services/errors'
import { SERVER_HOUSEHOLD } from '@/services/homeServer'
import { canDelete, canUpdate } from '@/services/permissions'
import { ingredientText, shareText, weekdaysText } from '@/services/share'
import { fieldText, recordTitle, titleContext } from '@/services/titles'
import { settingsStore, toastStore } from '@/store'
import type { FamilyRecord } from '@/types/records'
import { TRASH_DAYS } from '@/types/trash'
import { moduleLink, telLink } from '@/utils/links'
import { History } from './History'
import { PrintableRecord } from './PrintableRecord'
import { FileViewer } from './FileViewer'
import { VISIBILITY_LABELS } from './labels'
import { LinkItem } from './LinkItem'
import { ScanPanel } from './ScanPanel'
import { ShareDialog } from './ShareDialog'

interface RecordDetailProps { record: FamilyRecord; onClose: () => void; onEdit: () => void; onDuplicate: (data: RecordData) => void }

export function RecordDetail({ record, onClose, onEdit, onDuplicate }: RecordDetailProps) {
  const { actor, members, records } = useHome()
  const { forRecord } = useCompletion()
  const [preview, setPreview] = useState<RemovalSummary>()
  const [sharing, setSharing] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [copying, setCopying] = useState(false)
  const [error, setError] = useState<string>()
  const [completion, setCompletion] = useState<CompletionNotice>()
  const doneButton = useRef<HTMLButtonElement>(null)
  const household = SERVER_HOUSEHOLD
  const photoReading = useStore(settingsStore, (s) => s.settings.photoReading)
  const type = getRecordType(record.typeId)
  const module = getModule(record.moduleId)
  const context = titleContext(members, records)
  const title = recordTitle(record, context)
  const done = type.doneField ? Boolean(record.data[type.doneField]) : undefined
  const showError = (cause: unknown) => setError(describeError(cause))
  const toggle = done === undefined ? undefined : forRecord(record, title, done, { success: setCompletion, error: showError })
  const attempt = (work: Promise<unknown>) => work.catch(showError)

  const remove = async () => {
    const entry = await repositories.records.remove(actor.id, record.id)
    const { show } = toastStore.getState()
    const undo = () => {
      repositories.trash.restore(actor.id, entry)
        .then(() => show(`Recuperado: ${title}`))
        .catch((cause: unknown) => show(describeError(cause), 'error'))
    }
    show(`Eliminado: ${title}`, 'success', { label: 'Deshacer', run: undo })
    onClose()
  }
  const duplicate = async () => {
    setCopying(true)
    try { onDuplicate(await withOwnFiles(actor.id, record)) } finally { setCopying(false) }
  }
  if (sharing) return <ShareDialog record={record} onClose={() => setSharing(false)} />
  if (preview) {
    return (
      <ConfirmDialog open title={`Eliminar «${title}»`} confirmLabel={`Eliminar ${type.name.toLowerCase()}`} error={error} onClose={() => { setPreview(undefined); setError(undefined) }} onConfirm={() => { void attempt(remove()) }}>
        <p>{removalText(preview)} Podrás recuperarlo durante {TRASH_DAYS} días en la papelera de Ajustes.</p>
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
          <p role="status" className={completion ? 'min-w-0 basis-full font-bold [overflow-wrap:anywhere]' : 'sr-only'}>{completion?.message}</p>
          {canDelete(actor, record) && <Button icon={Trash2} onClick={() => { void attempt(repositories.records.previewRemoval(actor.id, record.id).then(setPreview)) }}>Eliminar</Button>}
          {toggle && (
            <Button ref={doneButton} icon={done ? Undo2 : Check} variant={done ? 'secondary' : 'confirm'} className="min-w-0 [overflow-wrap:anywhere] max-[24rem]:px-3" onClick={() => {
              setError(undefined)
              if (done) setCompletion(undefined)
              void toggle()
            }}>{done ? 'Marcar pendiente' : 'Hecho'}</Button>
          )}
          {completion && <Button icon={Undo2} className="min-w-0 [overflow-wrap:anywhere] max-[24rem]:px-3" onClick={() => {
            void attempt(completion.undo().then(() => {
              setError(undefined)
              setCompletion(undefined)
              doneButton.current?.focus()
            }))
          }}>Deshacer</Button>}
          {canUpdate(actor, record) && <Button icon={Pencil} variant="primary" onClick={onEdit}>Cambiar</Button>}
        </>
      }
    >
      <p className="mb-4 text-apagado">{type.name} en <Link to={moduleLink(module.id)} onClick={onClose} className="font-bold underline underline-offset-4">{module.name}</Link></p>
      <div className="mb-5 flex flex-wrap gap-2">
        <Button size="sm" icon={Share2} onClick={() => setSharing(true)}>Compartir</Button>
        <ListenButton text={() => shareText(record, context)} />
        <Button size="sm" icon={Printer} onClick={() => setPrinting(true)}>Imprimir</Button>
        {canDuplicate(actor, record) && <Button size="sm" icon={CopyPlus} disabled={copying} onClick={() => { void attempt(duplicate()) }}>{copying ? 'Copiando…' : 'Duplicar'}</Button>}
      </div>
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
      <History record={record} />
      {printing && <PrintSheet onDone={() => setPrinting(false)}><PrintableRecord record={record} /></PrintSheet>}
      {module.disclaimer && <div className="mt-5"><Disclaimer kind={module.disclaimer} /></div>}
    </Dialog>
  )
}

/** Cada registro tiene sus propios archivos: si no, borrar uno dejaría al otro sin ellos. */
async function withOwnFiles(actorId: string, record: FamilyRecord): Promise<RecordData> {
  const data = duplicateData(record)
  for (const [name, field] of Object.entries(getRecordType(record.typeId).fields)) {
    if (field.kind !== 'files') continue
    const copies = await Promise.all(((data[name] ?? []) as string[]).map((id) => repositories.files.copy(actorId, id)))
    data[name] = copies.flatMap((f) => (f ? [f.id] : []))
  }
  return data
}

const WIDE: ReadonlySet<Field['kind']> = new Set(['textarea', 'ingredients', 'files', 'links'])

function renderValue(field: Field, value: unknown, text: string): ReactNode {
  if (value === undefined || (Array.isArray(value) && value.length === 0)) return null
  switch (field.kind) {
    case 'files': return <div className="mt-1 grid grid-cols-1 gap-3">{(value as string[]).map((id) => <FileViewer key={id} id={id} />)}</div>
    case 'links': return <ul className="mt-1 grid grid-cols-1 gap-2">{(value as string[]).map((link) => <li key={link}><LinkItem link={link} /></li>)}</ul>
    case 'weekdays': return weekdaysText(value as number[])
    case 'phone': return <a href={telLink(text)} className="font-bold underline underline-offset-4">{text}</a>
    case 'url': return <a href={text} target="_blank" rel="noopener noreferrer" className="font-bold underline underline-offset-4">{text}</a>
    case 'ingredients': return <ul className="list-disc pl-6">{(value as Ingredient[]).map((i, n) => <li key={n}>{ingredientText(i)}</li>)}</ul>
    default: return text
  }
}

function removalText({ removed, changed }: RemovalSummary): string {
  const parts = ['Se borrará este registro y sus archivos.']
  if (removed > 1) parts.push(removed === 2 ? 'También otro que depende de él.' : `También otros ${removed - 1} que dependen de él.`)
  if (changed > 0) parts.push(changed === 1 ? 'Otro dejará de estar enlazado.' : `Otros ${changed} dejarán de estar enlazados.`)
  return parts.join(' ')
}
