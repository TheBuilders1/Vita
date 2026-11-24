import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useHome } from '@/app/providers/home'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { EmptyState, Panel } from '@/components/ui/Panel'
import { useTitle } from '@/hooks/useTitle'
import { useToday } from '@/hooks/useToday'
import type { AgendaCategory } from '@/modules/types'
import { buildAgenda, occursOn } from '@/services/agenda'
import { addDays, addMonths, isIsoDate, monthWeeks, weekDays } from '@/utils/dates'
import { formatDay, formatMonth } from '@/utils/format'
import { AddDialog } from '@/features/planner/AddDialog'
import { AgendaRow } from './AgendaRow'
import { CategoryFilter } from './CategoryFilter'
import { CATEGORY_IDS } from './categories'
import { MonthGrid } from './MonthGrid'
import { WeekList } from './WeekList'

/** El menú se ve en la cocina; aquí se puede activar. */
const DEFAULT_VISIBLE = CATEGORY_IDS.filter((c) => c !== 'meal')

export function CalendarPage() {
  const { family, records, members } = useHome()
  const today = useToday()
  const [params, setParams] = useSearchParams()
  const [visible, setVisible] = useState<readonly AgendaCategory[]>(DEFAULT_VISIBLE)
  const [adding, setAdding] = useState(false)
  useTitle('Calendario')

  const requested = params.get('dia') ?? ''
  const day = isIsoDate(requested) ? requested : today
  const view = params.get('vista') === 'semana' ? 'week' : 'month'
  const go = (changes: { dia?: string; vista?: string }) => {
    setParams((p) => { for (const [k, v] of Object.entries(changes)) p.set(k, v); return p }, { replace: true })
  }

  const weeks = useMemo(() => (view === 'week' ? [weekDays(day)] : monthWeeks(day)), [view, day])
  const items = useMemo(() => {
    const enabled = new Set(family.enabledModules)
    return buildAgenda({ records: records.filter((r) => enabled.has(r.moduleId)), members, from: weeks[0]![0]!, to: weeks.at(-1)!.at(-1)! })
      .filter((i) => visible.includes(i.category))
  }, [family.enabledModules, records, members, weeks, visible])

  const step = (direction: 1 | -1) => go({ dia: view === 'week' ? addDays(day, direction * 7) : addMonths(day, direction) })
  const ofDay = items.filter((i) => occursOn(i, day))
  const period = view === 'week' ? `Semana del ${formatDay(weeks[0]![0]!).toLowerCase()}` : formatMonth(day)

  return (
    <div className="grid grid-cols-1 gap-5">
      <PageHeader title="Calendario" action={
        <div className="flex flex-wrap gap-1">
          <Button variant="confirm" icon={Plus} onClick={() => setAdding(true)}>Apuntar</Button>
          <Button aria-pressed={view === 'month'} variant={view === 'month' ? 'primary' : 'secondary'} onClick={() => go({ vista: 'mes' })}>Mes</Button>
          <Button aria-pressed={view === 'week'} variant={view === 'week' ? 'primary' : 'secondary'} onClick={() => go({ vista: 'semana' })}>Semana</Button>
        </div>
      } />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Button icon={ChevronLeft} onClick={() => step(-1)}>Anterior</Button>
        <Button onClick={() => go({ dia: today })}>Hoy</Button>
        <Button icon={ChevronRight} onClick={() => step(1)}>Siguiente</Button>
        <h2 aria-live="polite" className="text-2xl font-bold">{period}</h2>
      </div>
      <AddDialog open={adding} date={day} onClose={() => setAdding(false)} />
      <CategoryFilter visible={visible} onChange={setVisible} />
      {view === 'week' ? <WeekList days={weeks[0]!} today={today} items={items} /> : (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <MonthGrid weeks={weeks} day={day} today={today} items={items} onSelect={(dia) => go({ dia })} />
          <Panel title={formatDay(day)}>
            {ofDay.length === 0
              ? <EmptyState title="No hay nada este día" />
              : <ul className="grid grid-cols-1 gap-2">{ofDay.map((item) => <AgendaRow key={item.key} item={item} />)}</ul>}
          </Panel>
        </div>
      )}
    </div>
  )
}
