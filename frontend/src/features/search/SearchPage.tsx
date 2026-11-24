import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useHome } from '@/app/providers/home'
import { PageHeader } from '@/components/layout/PageHeader'
import { TextInput } from '@/components/ui/Field'
import { ModuleIcon } from '@/components/ui/ModuleIcon'
import { EmptyState, Panel } from '@/components/ui/Panel'
import { useRecordEditor } from '@/features/records/editor'
import { useTitle } from '@/hooks/useTitle'
import { getModule, getRecordType } from '@/modules/registry'
import { accessTo } from '@/services/permissions'
import { searchHome } from '@/services/search'
import { recordTitle, titleContext } from '@/services/titles'
import { moduleLink } from '@/utils/links'

/** Al volver de una habitación sigue ahí. Solo en memoria y solo para ese perfil: en la dirección lo vería cualquiera. */
let remembered = { actorId: '', query: '' }

const PAGE = 20
const ROW = 'flex min-h-14 w-full min-w-0 items-center gap-3 py-2 text-left leading-snug hover:bg-yeso focus-visible:outline-offset-[-3px] [overflow-wrap:anywhere]'

/** Otro perfil empieza de cero, aunque la pantalla siga abierta. */
export function SearchPage() {
  const { actor } = useHome()
  return <Search key={actor.id} />
}

function Search() {
  const { family, actor, members, records } = useHome()
  const editor = useRecordEditor()
  const [query, setQuery] = useState(remembered.actorId === actor.id ? remembered.query : '')
  const wanted = useDeferredValue(query)
  const [shown, setShown] = useState(PAGE)
  const input = useRef<HTMLInputElement>(null)
  useTitle('Buscar')
  useEffect(() => { input.current?.focus() }, [])

  const context = useMemo(() => titleContext(members, records), [members, records])
  const result = useMemo(() => {
    const modules = family.enabledModules.filter((id) => accessTo(actor, id) !== 'none')
    return searchHome({ query: wanted, records: records.filter((r) => modules.includes(r.moduleId)), members, modules })
  }, [wanted, family.enabledModules, actor, records, members])
  const total = result.records.length + result.modules.length + result.people.length
  const searching = wanted.trim() !== ''

  return (
    <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-5">
      <PageHeader title="Buscar" />
      <form role="search" onSubmit={(e) => e.preventDefault()}>
        <TextInput ref={input} label="Qué buscas" required type="search" enterKeyHint="search" autoComplete="off" help="Un nombre, un documento, una persona o una habitación. Da igual poner tildes o no." value={query}
          onChange={(e) => { const q = e.target.value; setShown(PAGE); setQuery(q); remembered = { actorId: actor.id, query: q } }} />
      </form>
      <output className="font-bold empty:hidden">{searching && (total === 0 ? '' : total === 1 ? '1 resultado' : `${total} resultados`)}</output>
      {searching && total === 0 && <EmptyState title="No hay nada con esas palabras">Prueba con menos palabras o con otra forma de decirlo. Solo se busca en lo que tu perfil puede ver.</EmptyState>}
      {result.records.length > 0 && (
        <Panel title="Guardado en tu hogar">
          <ul className="border-t-2 border-beige">
            {result.records.slice(0, shown).map((record) => (
              <li key={record.id} className="border-b-2 border-beige">
                <button type="button" onClick={() => editor.open(record.id)} className={ROW}>
                  <ModuleIcon id={record.moduleId} />
                  <span className="min-w-0"><span className="block font-bold">{recordTitle(record, context)}</span><span className="block text-apagado">{getRecordType(record.typeId).name}, en {getModule(record.moduleId).name}</span></span>
                </button>
              </li>
            ))}
          </ul>
          {result.records.length > shown && <button type="button" onClick={() => setShown(shown + PAGE)} className="min-h-11 font-bold underline underline-offset-4">Ver {Math.min(PAGE, result.records.length - shown)} más</button>}
        </Panel>
      )}
      {result.modules.length > 0 && (
        <Panel title="Habitaciones">
          <ul className="border-t-2 border-beige">
            {result.modules.map((m) => <li key={m.id} className="border-b-2 border-beige"><Link to={moduleLink(m.id)} className={ROW}><ModuleIcon id={m.id} /><span className="min-w-0"><span className="block font-bold">{m.name}</span><span className="block text-apagado">{m.description}</span></span></Link></li>)}
          </ul>
        </Panel>
      )}
      {result.people.length > 0 && (
        <Panel title="Personas">
          <ul className="border-t-2 border-beige">
            {result.people.map((m) => <li key={m.id} className="border-b-2 border-beige"><Link to={`/hogar/${m.id}`} className={ROW}><span className="min-w-0"><span className="block font-bold">{m.name}</span><span className="block text-apagado">{m.relationship}</span></span></Link></li>)}
          </ul>
        </Panel>
      )}
    </div>
  )
}
