import { Check, X } from 'lucide-react'
import { useMemo } from 'react'
import { useHome } from '@/app/providers/home'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Panel'
import { repositories } from '@/database'
import { useToday } from '@/hooks/useToday'
import { buildAgenda, type AgendaItem } from '@/services/agenda'
import { completionFor } from '@/services/completion'
import { describeError } from '@/services/errors'
import { toastStore } from '@/store'
import { Block, ModuleRecords } from './shared'

export function MedicationView() {
  const { records, members } = useHome()
  const today = useToday()
  const doses = useMemo(
    () => buildAgenda({ records: records.filter((r) => r.moduleId === 'medication'), members: [], from: today, to: today }),
    [records, today],
  )
  const people = members.filter((m) => doses.some((d) => d.memberIds.includes(m.id)))
  return (
    <div className="grid grid-cols-1 gap-6">
      <Block title="Tomas de hoy">
        {people.length === 0 ? <EmptyState title="Hoy no hay tomas previstas" /> : people.map((m) => (
          <div key={m.id} className="mb-4">
            <h4 className="mb-1 font-bold">{m.name}</h4>
            <ul className="grid grid-cols-1 gap-2">{doses.filter((d) => d.memberIds.includes(m.id)).map((d) => <Dose key={d.key} item={d} />)}</ul>
          </div>
        ))}
      </Block>
      <ModuleRecords moduleId="medication" />
    </div>
  )
}

function Dose({ item }: { item: AgendaItem }) {
  const { actor, records } = useHome()
  const today = useToday()
  const plan = records.find((r) => r.id === item.recordId)
  const completion = plan ? completionFor(item, plan, actor, today) : null
  const log = (status: 'taken' | 'skipped') => {
    if (completion?.kind !== 'log') return
    const { show } = toastStore.getState()
    repositories.records.create(actor.id, { typeId: completion.typeId, data: { ...completion.data, status } })
      .then((saved) => show(status === 'taken' ? `Tomada: ${item.title}` : `No tomada: ${item.title}`, 'success', {
        label: 'Deshacer', run: () => { repositories.records.erase(actor.id, saved.id).catch((e: unknown) => show(describeError(e), 'error')) },
      }))
      .catch((e: unknown) => show(describeError(e), 'error'))
  }
  return (
    <li className="flex flex-wrap items-center gap-3 border-l-4 border-cat-medication bg-yeso p-3">
      <span className="text-xl font-bold tabular-nums">{item.time}</span>
      <span className="min-w-32 flex-1">{item.title}<span className="block text-apagado">{item.detail}</span></span>
      {completion
        ? <span className="flex flex-wrap gap-1"><Button size="sm" variant="confirm" icon={Check} onClick={() => log('taken')}>Tomada</Button><Button size="sm" icon={X} onClick={() => log('skipped')}>No tomada</Button></span>
        : <strong>{item.logStatus === 'skipped' ? 'No tomada' : item.done ? 'Tomada' : 'Pendiente'}</strong>}
    </li>
  )
}
