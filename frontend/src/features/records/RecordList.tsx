import { Check, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useHome } from '@/app/providers/home'
import { Button } from '@/components/ui/Button'
import { SelectInput, TextInput } from '@/components/ui/Field'
import { EmptyState } from '@/components/ui/Panel'
import { repositories } from '@/database'
import { useToday } from '@/hooks/useToday'
import type { Field, RecordData } from '@/modules/fields'
import type { RecordTypeDef } from '@/modules/types'
import { describeError } from '@/services/errors'
import { accessTo, canComplete } from '@/services/permissions'
import { byRelevance } from '@/services/sorting'
import { fieldText, recordTitle, titleContext, type TitleContext } from '@/services/titles'
import { toastStore } from '@/store'
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
  const { records: all, members } = useHome()
  const today = useToday()
  const editor = useRecordEditor()
  const canCreate = useCanCreate(type)
  const [person, setPerson] = useState('')
  const [query, setQuery] = useState('')
  const context = useMemo(() => titleContext(members, all), [members, all])

  const own = useMemo(() => (given ?? all.filter((r) => r.typeId === type.id)).toSorted(byRelevance(today)), [given, all, type.id, today])
  const people = members.filter((m) => own.some((r) => r.subjectIds.includes(m.id)))
  const needle = query.trim().toLowerCase()
  const visible = own.filter((r) => (!person || r.subjectIds.includes(person)) && (!needle || `${recordTitle(r, context)} ${summary(type, r, context)}`.toLowerCase().includes(needle)))
  const add = canCreate && <Button variant="primary" size="sm" icon={Plus} onClick={() => editor.create(type.id, preset)}>Añadir {type.name.toLowerCase()}</Button>

  if (own.length === 0) return <EmptyState title={`${type.plural}: todavía no hay nada`} action={add} />
  return (
    <div className="grid grid-cols-1 gap-3">
      <div>{add}</div>
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
  const editor = useRecordEditor()
  const done = type.doneField ? Boolean(record.data[type.doneField]) : undefined
  const title = recordTitle(record, context)
  const toggle = () => {
    repositories.records.setDone(actor.id, record.id, !done).catch((e: unknown) => toastStore.getState().show(describeError(e), 'error'))
  }
  return (
    <li className="flex items-center gap-2 border-b-2 border-beige">
      {done !== undefined && (
        <button type="button" aria-pressed={done} disabled={!canComplete(actor, record)} onClick={toggle} aria-label={`Hecho: ${title}`} className="grid size-11 shrink-0 place-items-center focus-visible:outline-offset-[-3px] disabled:opacity-50">
          <span className={`grid size-7 place-items-center border-2 ${done ? 'border-oliva bg-oliva text-crema' : 'border-borde bg-crema'}`}>{done && <Check aria-hidden="true" className="size-5" />}</span>
        </button>
      )}
      <button type="button" onClick={() => editor.open(record.id)} className="min-h-14 min-w-0 flex-1 py-2 text-left leading-snug hover:bg-yeso focus-visible:outline-offset-[-3px]">
        <span className={`block font-bold underline-offset-4 hover:underline ${done ? 'line-through' : ''}`}>{title}</span>
        <span className="block text-apagado">{summary(type, record, context)}</span>
      </button>
    </li>
  )
}

const SKIP: ReadonlySet<Field['kind']> = new Set(['textarea', 'files', 'links', 'ingredients', 'boolean', 'weekdays', 'choices'])

/** Los datos más útiles en una línea, sin repetir el título. */
function summary(type: RecordTypeDef, record: FamilyRecord, context: TitleContext): string {
  const title = recordTitle(record, context)
  return Object.entries(type.fields)
    .filter(([name, f]) => name !== type.titleField && !f.hidden && !SKIP.has(f.kind))
    .map(([name]) => fieldText(record, name, context))
    .filter((text) => text && !title.includes(text))
    .slice(0, 4)
    .join(', ')
}
