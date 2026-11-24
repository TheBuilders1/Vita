import { ChevronLeft, ChevronRight, Download, Plus } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useHome } from '@/app/providers/home'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { EmptyState, Panel } from '@/components/ui/Panel'
import { useTitle } from '@/hooks/useTitle'
import { useToday } from '@/hooks/useToday'
import type { AgendaCategory } from '@/modules/types'
import { buildAgenda, occursOn } from '@/services/agenda'
import { buildIcs, IcsSizeError, LEAP_EXPORT_YEARS } from '@/services/ics'
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
  const { actor, family, records, members } = useHome()
  const today = useToday()
  const [params, setParams] = useSearchParams()
  const [visible, setVisible] = useState<readonly AgendaCategory[]>(DEFAULT_VISIBLE)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string>()
  const [adding, setAdding] = useState(false)
  const mobilePeriod = useRef<HTMLHeadingElement>(null)
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

  const saveCalendar = () => {
    let text: string | null
    try {
      text = buildIcs({ actor, records, members, enabled: family.enabledModules, visible, today, stamp: new Date() })
    } catch (cause) {
      if (!(cause instanceof IcsSizeError)) throw cause
      setExportError('El archivo es demasiado grande. Elige menos categorías y vuelve a intentarlo.')
      return
    }
    if (text === null) {
      setExportError('No hay fechas pendientes para guardar con estas categorías.')
      return
    }
    const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' }))
    Object.assign(document.createElement('a'), { href: url, download: 'vita-calendario.ics' }).click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setExporting(false)
  }

  const step = (direction: 1 | -1) => go({ dia: view === 'week' ? addDays(day, direction * 7) : addMonths(day, direction) })
  const ofDay = items.filter((i) => occursOn(i, day))
  const period = view === 'week' ? `Semana del ${formatDay(weeks[0]![0]!).toLowerCase()}` : formatMonth(day)
  const periodName = view === 'week' ? 'Semana' : 'Mes'

  return (
    <div className="grid grid-cols-1 gap-2 sm:gap-5">
      <div className="hidden sm:block">
        <PageHeader title="Calendario" action={
          <div className="flex flex-wrap gap-1">
            <Button variant="confirm" icon={Plus} onClick={() => setAdding(true)}>Apuntar</Button>
            <Button aria-pressed={view === 'month'} variant={view === 'month' ? 'primary' : 'secondary'} onClick={() => go({ vista: 'mes' })}>Mes</Button>
            <Button aria-pressed={view === 'week'} variant={view === 'week' ? 'primary' : 'secondary'} onClick={() => go({ vista: 'semana' })}>Semana</Button>
          </div>
        } />
      </div>
      <header className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 sm:hidden">
        <h1 className="text-2xl font-bold">Calendario</h1>
        <Button size="sm" variant="confirm" icon={Plus} onClick={() => setAdding(true)}>Apuntar</Button>
      </header>
      <div className="hidden flex-wrap items-center gap-x-3 gap-y-2 sm:flex">
        <Button icon={ChevronLeft} onClick={() => step(-1)}>Anterior</Button>
        <Button onClick={() => go({ dia: today })}>Hoy</Button>
        <Button icon={ChevronRight} onClick={() => step(1)}>Siguiente</Button>
        <h2 aria-live="polite" className="text-2xl font-bold">{period}</h2>
      </div>
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1 sm:hidden">
        <button type="button" aria-label={`${periodName} anterior`} onClick={() => step(-1)} className={stepButton}>
          <ChevronLeft aria-hidden="true" className="size-5" />
        </button>
        <div className="flex flex-wrap items-center justify-center gap-x-2 text-center">
          <h2 ref={mobilePeriod} tabIndex={-1} aria-live="polite" className="min-w-0 text-lg font-bold">{period}</h2>
          {day !== today && <Button size="sm" className="min-w-11" onClick={() => {
            go({ dia: today })
            mobilePeriod.current?.focus()
          }}>Hoy</Button>}
        </div>
        <button type="button" aria-label={`${periodName} siguiente`} onClick={() => step(1)} className={stepButton}>
          <ChevronRight aria-hidden="true" className="size-5" />
        </button>
      </div>
      <AddDialog open={adding} date={day} onClose={() => setAdding(false)} />
      <div className="max-sm:flex max-sm:flex-wrap max-sm:items-center max-sm:gap-x-3 max-sm:gap-y-1 max-[24rem]:gap-x-1">
        <div role="group" aria-label="Vista del calendario" className="flex flex-wrap sm:hidden">
          <Button size="sm" className="max-[24rem]:px-2" aria-pressed={view === 'month'} variant={view === 'month' ? 'primary' : 'secondary'} onClick={() => go({ vista: 'mes' })}>Mes</Button>
          <Button size="sm" className="max-[24rem]:px-2" aria-pressed={view === 'week'} variant={view === 'week' ? 'primary' : 'secondary'} onClick={() => go({ vista: 'semana' })}>Semana</Button>
        </div>
        <CategoryFilter visible={visible} onChange={setVisible} />
      </div>
      <Dialog open={exporting} title="Guardar calendario" error={exportError} onClose={() => setExporting(false)} footer={
        <>
          <Button className="max-w-full [overflow-wrap:anywhere]" onClick={() => setExporting(false)}>Cancelar</Button>
          <Button className="max-w-full [overflow-wrap:anywhere]" variant="primary" disabled={exportError !== undefined} onClick={saveCalendar}>Descargar archivo</Button>
        </>
      }>
        <p>El archivo sale de Vita sin cifrar. Incluye las fechas de las categorías visibles, también las de otros meses.</p>
        <p className="mt-3">Las fechas anuales del 29 de febrero que pasan al 1 de marzo se guardan en un tramo de hasta {LEAP_EXPORT_YEARS} años.</p>
      </Dialog>
      {view === 'week' ? <WeekList days={weeks[0]!} today={today} items={items} /> : (
        <div className="grid grid-cols-1 items-start gap-3 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="min-w-0 max-[24rem]:mx-[calc(2px_-_1rem)]">
            <MonthGrid weeks={weeks} day={day} today={today} items={items} onSelect={(dia) => go({ dia })} />
          </div>
          <Panel title={formatDay(day)} className="max-sm:p-3">
            {ofDay.length === 0
              ? <><p className="text-apagado sm:hidden">No hay nada este día</p><div className="hidden sm:block"><EmptyState title="No hay nada este día" /></div></>
              : <ul className="grid grid-cols-1 gap-2">{ofDay.map((item) => <AgendaRow key={item.key} item={item} />)}</ul>}
          </Panel>
        </div>
      )}
      <div>
        <Button size="sm" icon={Download} className="max-w-full [overflow-wrap:anywhere] max-[24rem]:px-2" onClick={() => { setExportError(undefined); setExporting(true) }}>Guardar para otro calendario</Button>
      </div>
    </div>
  )
}

const stepButton = 'grid min-h-[44px] min-w-[44px] place-items-center bg-crema hover:bg-beige focus-visible:outline-offset-[-3px]'
