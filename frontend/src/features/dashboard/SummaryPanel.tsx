import { ListTodo, MessageCircle, Plus, Siren } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useHome } from '@/app/providers/home'
import { Button, ButtonLink } from '@/components/ui/Button'
import { AddDialog } from '@/features/planner/AddDialog'
import { TipCard } from '@/features/tips/TipCard'
import { AgendaRow } from '@/features/calendar/AgendaRow'
import { useAttention } from '@/hooks/useAttention'
import { useTips } from '@/hooks/useTips'
import { useToday } from '@/hooks/useToday'
import { monthExpenses, WHEN, type AttentionItem, type When } from '@/services/attention'
import { accessTo, canManage } from '@/services/permissions'
import { formatDay, formatMoney, formatMonth } from '@/utils/format'
import { StartCard } from './StartCard'

const TITLES: Record<When, string> = {
  overdue: 'Atrasado', today: 'Hoy', tomorrow: 'Mañana', week: 'Esta semana', soon: 'Más adelante', someday: 'Sin fecha',
}
const MAX_TIPS = 3
/** Lo urgente se enseña entero; lo demás, resumido. */
const VISIBLE: Record<When, number> = { overdue: 4, today: 12, tomorrow: 12, week: 3, soon: 3, someday: 2 }

/** Responde a «qué toca» en una sola lista por orden de urgencia. */
export function SummaryPanel() {
  const { family, actor, records } = useHome()
  const today = useToday()
  const items = useAttention()
  const tips = useTips().slice(0, MAX_TIPS)
  const [adding, setAdding] = useState(false)
  const urgent = items.filter((i) => i.when === 'overdue' || i.when === 'today').length
  const starting = records.length === 0 && canManage(actor, 'family')
  const seesMoney = family.enabledModules.includes('finances') && accessTo(actor, 'finances') !== 'none'
  const expenses = useMemo(() => (seesMoney ? monthExpenses(records, today) : 0), [records, seesMoney, today])
  return (
    <section aria-labelledby="summary-title" className="bg-crema p-4 shadow-panel sm:p-5">
      <p className="text-apagado">{formatDay(today)}</p>
      <h2 id="summary-title" className="text-2xl font-bold">{starting ? 'Tu hogar está listo' : headline(urgent)}</h2>
      {starting && <StartCard onAdd={() => setAdding(true)} />}
      <div className="mt-3 flex flex-wrap gap-1">
        <ButtonLink to="/planta/health/emergency" variant="danger" icon={Siren}>Emergencias</ButtonLink>
        {!starting && <Button variant="primary" icon={Plus} onClick={() => setAdding(true)}>Apuntar</Button>}
        <ButtonLink to="/vita" icon={MessageCircle}>Pídeselo a Vita</ButtonLink>
        <ButtonLink to="/tareas" icon={ListTodo}>Tareas</ButtonLink>
      </div>
      <AddDialog open={adding} onClose={() => setAdding(false)} />
      {WHEN.map((when) => <Group key={when} when={when} items={items.filter((i) => i.when === when)} />)}
      {tips.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-2 text-lg font-bold">Consejos</h3>
          <ul className="grid grid-cols-1 gap-2">{tips.map((t) => <TipCard key={t.id} tip={t} />)}</ul>
        </div>
      )}
      {expenses > 0 && (
        <p className="mt-5 border-t-2 border-beige pt-4">
          Gasto registrado en {formatMonth(today).toLowerCase()}: <strong className="tabular-nums">{formatMoney(expenses)}</strong>
        </p>
      )}
    </section>
  )
}

function headline(urgent: number): string {
  if (urgent === 0) return 'Hoy está todo al día'
  return urgent === 1 ? 'Hay una cosa que atender' : `Hay ${urgent} cosas que atender`
}

function Group({ when, items }: { when: When; items: readonly AttentionItem[] }) {
  const [all, setAll] = useState(false)
  if (items.length === 0) return null
  const visible = all ? items : items.slice(0, VISIBLE[when])
  const hidden = items.length - visible.length
  return (
    <div className="mt-5">
      <h3 className={`mb-2 text-lg font-bold ${when === 'overdue' ? 'text-peligro' : ''}`}>{TITLES[when]}</h3>
      <ul className="grid grid-cols-1 gap-2">
        {visible.map(({ id, item }) => <AgendaRow key={id} item={item} showDate={when === 'overdue' || when === 'week' || when === 'soon'} />)}
      </ul>
      {(hidden > 0 || all) && items.length > VISIBLE[when] && (
        <button type="button" aria-expanded={all} onClick={() => setAll(!all)} className="min-h-11 font-bold underline underline-offset-4">
          {all ? 'Ver menos' : `Ver ${hidden} más`}
        </button>
      )}
    </div>
  )
}
