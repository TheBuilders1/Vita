import { Check, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useHome } from '@/app/providers/home'
import { Button } from '@/components/ui/Button'
import { SelectInput, TextInput } from '@/components/ui/Field'
import { EmptyState } from '@/components/ui/Panel'
import { useCompletion } from '@/hooks/useCompletion'
import { useToday } from '@/hooks/useToday'
import type { Field, RecordData } from '@/modules/fields'
import { getModule } from '@/modules/registry'
import type { RecordTypeDef } from '@/modules/types'
import { addableTypes, missingParent } from '@/services/adding'
import { repositories } from '@/database'
import { describeError } from '@/services/errors'
import { toastStore } from '@/store'
import { accessTo, canUpdate } from '@/services/permissions'
import { byRelevance } from '@/services/sorting'
import { fieldText, recordTitle, titleContext, type TitleContext } from '@/services/titles'
import type { FamilyRecord } from '@/types/records'
import { useRecordEditor } from './editor'

interface RecordListProps { type: RecordTypeDef; records?: readonly FamilyRecord[]; preset?: RecordData }

const SEARCH_FROM = 8

export function useCanCreate(type: RecordTypeDef): boolean {
  const { actor } = useHome()
  const access = accessTo(actor, type.moduleId)
  return access === 'write' || (access === 'read' && type.selfLog)
}

/** Lista de un tipo de registro: buscar, filtrar por persona, abrir y añadir. */
export function RecordList({ type, records: given, preset }: RecordListProps) {
  const { records: all, members, actor } = useHome()
  const today = useToday()
  const editor = useRecordEditor()
  // Si es lo único que se puede añadir, ya está el botón grande al entrar en la habitación.
  const top = getModule(type.moduleId).floor === null ? [] : addableTypes(type.moduleId, actor, all)
  const canCreate = useCanCreate(type) && !(top.length === 1 && top[0]!.id === type.id && preset === undefined)
  const parent = preset === undefined ? missingParent(type, all) : undefined
  const canCreateParent = useCanCreate(parent ?? type)
  const [person, setPerson] = useState('')
  const [query, setQuery] = useState('')
  const context = useMemo(() => titleContext(members, all), [members, all])

  const own = useMemo(() => (given ?? all.filter((r) => r.typeId === type.id)).toSorted(byRelevance(today)), [given, all, type.id, today])
  const people = members.filter((m) => own.some((r) => r.subjectIds.includes(m.id)))
  const needle = query.trim().toLowerCase()
  const visible = own.filter((r) => (!person || r.subjectIds.includes(person)) && (!needle || `${recordTitle(r, context)} ${summary(type, r, context)}`.toLowerCase().includes(needle)))
  const add = canCreate && !parent && <Button size="sm" icon={Plus} onClick={() => editor.create(type.id, preset)}>Añadir {type.name.toLowerCase()}</Button>

  if (own.length === 0) return <EmptyState title={`${type.plural}: todavía no hay nada`} action={add}>{canCreate && parent && canCreateParent && `Antes añade ${parent.name.toLowerCase()}.`}</EmptyState>
  return (
    <div className="grid grid-cols-1 gap-3">
      {add && <div>{add}</div>}
      {(people.length > 1 || own.length > SEARCH_FROM) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {own.length > SEARCH_FROM && <TextInput label="Buscar" required type="search" value={query} onChange={(e) => setQuery(e.target.value)} />}
          {people.length > 1 && <SelectInput label="Persona" required empty="Todas" value={person} options={people.map((m) => ({ value: m.id, label: m.name }))} onChange={(e) => setPerson(e.target.value)} />}
        </div>
      )}
      {visible.length === 0
        ? <p className="text-apagado">Nada coincide con la búsqueda.</p>
        : <ul className="border-t-2 border-beige">{visible.map((r) => <RecordRow key={r.id} record={r} type={type} context={context} />)}</ul>}
    </div>
  )
}

function RecordRow({ record, type, context }: { record: FamilyRecord; type: RecordTypeDef; context: TitleContext }) {
  const { actor } = useHome()
  const editable = canUpdate(actor, record)
  const { forRecord } = useCompletion()
  const editor = useRecordEditor()
  const done = type.doneField ? Boolean(record.data[type.doneField]) : undefined
  const title = recordTitle(record, context)
  const cancel = async () => {
    if (!window.confirm(`¿Quieres cancelar el plan «${title}»?`)) return
    const show = toastStore.getState().show
    const fail = (error: unknown) => show(describeError(error), 'error')
    try {
      const saved = await repositories.records.update(actor.id, record.id, { ifUnchanged: record.updatedAt, data: { ...record.data, status: 'cancelled' } })
      show('Plan cancelado', 'success', { label: 'Deshacer', run: () => {
        repositories.records.update(actor.id, record.id, { data: record.data, ifUnchanged: saved.updatedAt }).catch(fail)
      } })
    } catch (error) { fail(error) }
  }
  const toggle = done === undefined ? undefined : forRecord(record, title, done)
  return (
    <li className="flex flex-wrap items-center gap-2 border-b-2 border-beige">
      {done !== undefined && (
        <button type="button" aria-pressed={done} disabled={!toggle} onClick={toggle} aria-label={`Hecho: ${title}`} className="grid size-11 shrink-0 place-items-center focus-visible:outline-offset-[-3px] disabled:opacity-50">
          <span className={`grid size-7 place-items-center border-2 ${done ? 'border-oliva bg-oliva text-crema' : 'border-borde bg-crema'}`}>{done && <Check aria-hidden="true" className="size-5" />}</span>
        </button>
      )}
      <button type="button" onClick={() => editor.open(record.id)} className="min-h-14 min-w-0 basis-36 grow break-words py-2 text-left leading-snug hover:bg-yeso focus-visible:outline-offset-[-3px]">
        <span className={`block font-bold underline-offset-4 hover:underline ${done ? 'line-through' : ''}`}>{title}</span>
        <span className="block text-apagado">{record.data.status === 'cancelled' && 'Cancelado · '}{summary(type, record, context)}</span>
      </button>
      {editable && <Button size="sm" onClick={() => editor.edit(record.id)}>Cambiar<span className="sr-only"> {title}</span></Button>}
      {editable && type.id === 'outing' && record.data.status !== 'cancelled' && <Button size="sm" onClick={() => void cancel()}>Cancelar plan</Button>}
    </li>
  )
}

const SKIP: ReadonlySet<Field['kind']> = new Set(['textarea', 'files', 'links', 'ingredients', 'boolean', 'weekdays', 'choices'])

/** Los datos más útiles en una línea, sin repetir el título. */
function summary(type: RecordTypeDef, record: FamilyRecord, context: TitleContext): string {
  const title = recordTitle(record, context)
  return Object.entries(type.fields)
    .filter(([name, f]) => !(f.kind === 'text' && f.secret) && !(name === 'status' && record.data.status === 'cancelled') && name !== type.titleField && !f.hidden && !SKIP.has(f.kind))
    .map(([name]) => fieldText(record, name, context))
    .filter((text) => text && !title.includes(text))
    .slice(0, 4)
    .join(', ')
}
