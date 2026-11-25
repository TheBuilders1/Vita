import { Check, ExternalLink, Pencil, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { useStore } from 'zustand'
import { useHome } from '@/app/providers/home'
import { Button } from '@/components/ui/Button'
import { ModuleIcon } from '@/components/ui/ModuleIcon'
import { Notice } from '@/components/ui/Notice'
import { repositories } from '@/database'
import { useRecordEditor } from '@/features/records/editor'
import { VISIBILITY_LABELS } from '@/features/records/labels'
import { getModule, getRecordType } from '@/modules/registry'
import type { Proposal } from '@/services/chat'
import { canCreate } from '@/services/permissions'
import { subjectsOf } from '@/services/integrity'
import { describeError } from '@/services/errors'
import { ingredientText } from '@/services/share'
import type { Ingredient } from '@/modules/fields'
import { SERVER_HOUSEHOLD } from '@/services/homeServer'
import { keepFilesOnServer } from '@/services/serverDocuments'
import { settingsStore } from '@/store'
import { fieldText, titleContext } from '@/services/titles'
import type { CardStatus } from '@/store/chatStore'
import type { FamilyRecord } from '@/types/records'
import { weekdayOf } from '@/utils/dates'
import { WEEKDAYS } from '@/utils/format'

/** Lo que Vita ha entendido, para revisarlo. Solo se guarda al pulsar. */
export function ProposalCard({ proposal, status, onStatus }: { proposal: Proposal; status: CardStatus | undefined; onStatus: (status: CardStatus) => void }) {
  const { actor, family, members, records } = useHome()
  const editor = useRecordEditor()
  const connected = useStore(settingsStore, (s) => s.settings.connectedChat)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const type = getRecordType(proposal.typeId)
  const canSave = family.enabledModules.includes(type.moduleId) && canCreate(actor, type.id, subjectsOf(type.id, proposal.data))
  const context = titleContext(members, records)
  const draft: FamilyRecord = { id: 'propuesta', typeId: type.id, moduleId: type.moduleId, ownerId: actor.id, subjectIds: [], visibility: type.visibility.default, sharedWith: [], data: proposal.data, createdAt: '', updatedAt: '' }
  const rows = Object.entries(type.fields).flatMap(([name, field]) => {
    const value = proposal.data[name]
    if (value === undefined || value === false || field.hidden || (Array.isArray(value) && value.length === 0)) return []
    // Los adjuntos se ven en la ficha; aquí basta con saber que van.
    if (field.kind === 'files' && Array.isArray(value)) return [{ name, label: field.label, text: value.length === 1 ? '1 archivo adjunto' : `${value.length} archivos adjuntos` }]
    if (field.kind === 'ingredients' && Array.isArray(value)) return [{ name, label: field.label, text: (value as Ingredient[]).map(ingredientText).join(', ') }]
    const text = `${fieldText(draft, name, context)}${'unit' in field && field.unit ? ` ${field.unit}` : ''}`
    return [{ name, label: field.label, text: field.kind === 'date' ? `${WEEKDAYS[weekdayOf(String(value)) - 1]}, ${text}` : text }]
  })

  const attempt = async (work: () => Promise<CardStatus>) => {
    setBusy(true)
    setError(undefined)
    try {
      onStatus(await work())
    } catch (cause) {
      setError(describeError(cause))
    }
    setBusy(false)
  }
  const save = () => attempt(async () => {
    const recordId = (await repositories.records.create(actor.id, { typeId: type.id, data: proposal.data })).id
    const fileIds = Object.entries(type.fields).flatMap(([name, field]) => (field.kind === 'files' && Array.isArray(proposal.data[name]) ? proposal.data[name] as string[] : []))
    if (!connected || SERVER_HOUSEHOLD === null || fileIds.length === 0) return { state: 'saved', recordId }
    // Las fotos y los PDF también van a la base del servidor del hogar; si falla, siguen aquí.
    const kept = await keepFilesOnServer(fileIds, { household: SERVER_HOUSEHOLD, get: (id) => repositories.files.get(actor.id, id) })
    return { state: 'saved', recordId, ...(kept.failed ? { server: 'failed' } : kept.kept ? { server: 'saved' } : {}) }
  })
  const undo = (id: string) => attempt(async () => { await repositories.records.erase(actor.id, id); return { state: 'undone' } })
  // Una vez abierto en el formulario no se ofrece «Guardar» aquí: se guardaría dos veces.
  const edit = () => { onStatus({ state: 'editing' }); editor.create(type.id, proposal.data) }

  return (
    <div className="chat-card min-w-0 max-[24rem]:p-2">
      <h2 className="flex items-center gap-3 text-lg font-bold"><ModuleIcon id={type.moduleId} className="size-6" />{type.name}</h2>
      <dl className="mt-2 grid grid-cols-1 gap-2">
        {rows.map((r) => <div key={r.name}><dt className="inline font-bold">{r.label}: </dt><dd className="inline break-words">{r.text}</dd></div>)}
        <div><dt className="inline font-bold">Quién puede verlo: </dt><dd className="inline">{VISIBILITY_LABELS[type.visibility.default].label}</dd></div>
      </dl>
      {proposal.notes.length > 0 && <div className="mt-3"><Notice tone="warning"><ul>{proposal.notes.map((n) => <li key={n}>{n}</li>)}</ul></Notice></div>}
      {proposal.missing.length > 0 && <p className="mt-3">Falta: <strong>{proposal.missing.join(', ')}</strong>.</p>}
      <div role="status" className="mt-3 font-bold empty:hidden">
        {status?.state === 'saved' && `Guardado en ${getModule(type.moduleId).name}.`}
        {status?.state === 'saved' && status.server === 'saved' && ' El archivo también está guardado en el servidor de tu hogar.'}
        {status?.state === 'saved' && status.server === 'failed' && ' No se ha podido copiar el archivo al servidor de tu hogar: sigue guardado en este dispositivo.'}
        {status?.state === 'undone' && 'Deshecho: no está guardado.'}
        {status?.state === 'editing' && 'Abierto en el formulario. Se guarda desde ahí.'}
      </div>
      <div role="alert" className="mt-3 empty:hidden">{error && <Notice tone="error">{error}</Notice>}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {status?.state === 'saved' ? (
          <>
            <Button icon={ExternalLink} disabled={busy} onClick={() => editor.open(status.recordId)}>Abrir</Button>
            <Button icon={Undo2} disabled={busy} onClick={() => { void undo(status.recordId) }}>Deshacer</Button>
          </>
        ) : canSave ? (
          <>
            {proposal.ready && status?.state !== 'editing' && <Button variant="confirm" icon={Check} disabled={busy} onClick={() => { void save() }}>Guardar<span className="sr-only"> {type.name.toLowerCase()}</span></Button>}
            <Button icon={Pencil} disabled={busy} onClick={edit}>{status?.state === 'editing' ? 'Volver a abrir' : proposal.ready ? 'Cambiar' : 'Completar'}<span className="sr-only"> {type.name.toLowerCase()}</span></Button>
          </>
        ) : <p>Tu perfil ya no puede guardar aquí.</p>}
      </div>
    </div>
  )
}
