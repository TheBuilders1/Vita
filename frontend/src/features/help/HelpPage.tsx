import { useState } from 'react'
import { Link } from 'react-router'
import { PageHeader } from '@/components/layout/PageHeader'
import { TextInput } from '@/components/ui/Field'
import { EmptyState, Panel } from '@/components/ui/Panel'
import { HELP } from '@/data/help'
import { useTitle } from '@/hooks/useTitle'
import { matches } from '@/utils/text'

export function HelpPage() {
  const [query, setQuery] = useState('')
  useTitle('Ayuda')
  const groups = HELP.map((g) => ({ ...g, topics: g.topics.filter((t) => matches(`${t.question} ${t.steps.join(' ')}`, query)) })).filter((g) => g.topics.length > 0)
  return (
    <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-5">
      <PageHeader title="Ayuda" description="Elige qué quieres hacer." />
      <form role="search" onSubmit={(e) => e.preventDefault()}>
        <TextInput label="Buscar en la ayuda" type="search" required autoComplete="off" value={query} onChange={(e) => setQuery(e.target.value)} />
      </form>
      {groups.length === 0 && <EmptyState title="No hay ayuda con esas palabras">Prueba con otra palabra o borra lo escrito para verla entera.</EmptyState>}
      {groups.map((group) => (
        <Panel key={group.title} title={group.title}>
          <div className="border-t-2 border-beige">
            {group.topics.map((topic) => (
              <details key={topic.id} id={topic.id} className="border-b-2 border-beige">
                <summary className="min-h-12 cursor-pointer py-3 font-bold hover:bg-yeso focus-visible:outline-offset-[-3px]">{topic.question}</summary>
                <div className="grid grid-cols-1 gap-2 pb-4 pl-5">
                  {topic.steps.map((step) => <p key={step} className="max-w-prose">{step}</p>)}
                  {topic.link && <p><Link to={topic.link.to} className="inline-flex min-h-11 items-center font-bold underline underline-offset-4">{topic.link.label}</Link></p>}
                </div>
              </details>
            ))}
          </div>
        </Panel>
      ))}
    </div>
  )
}
