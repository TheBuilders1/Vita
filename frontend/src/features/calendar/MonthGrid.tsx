import { useEffect, useRef, type KeyboardEvent } from 'react'
import { occursOn, type AgendaItem } from '@/services/agenda'
import { addDays, addMonths, startOfWeek } from '@/utils/dates'
import { cx } from '@/utils/cx'
import { formatDay, WEEKDAYS } from '@/utils/format'
import { CATEGORIES } from './categories'

interface MonthGridProps { weeks: readonly string[][]; day: string; today: string; items: readonly AgendaItem[]; onSelect: (day: string) => void }

const VISIBLE = 3

/** Tabla con un solo día en el orden de tabulación; las flechas mueven la selección. */
export function MonthGrid({ weeks, day, today, items, onSelect }: MonthGridProps) {
  const selected = useRef<HTMLButtonElement>(null)
  const moved = useRef(false)
  useEffect(() => {
    if (moved.current) selected.current?.focus()
    moved.current = false
  }, [day])

  const onKeyDown = (e: KeyboardEvent) => {
    const targets: Record<string, string> = {
      ArrowLeft: addDays(day, -1), ArrowRight: addDays(day, 1), ArrowUp: addDays(day, -7), ArrowDown: addDays(day, 7),
      Home: startOfWeek(day), End: addDays(startOfWeek(day), 6), PageUp: addMonths(day, -1), PageDown: addMonths(day, 1),
    }
    const target = targets[e.key]
    if (!target) return
    e.preventDefault()
    moved.current = true
    onSelect(target)
  }
  return (
    <table className="w-full table-fixed border-collapse bg-crema shadow-panel">
      <thead>
        <tr>{WEEKDAYS.map((name) => <th key={name} scope="col" className="px-1 py-2 text-left font-bold max-sm:text-center"><abbr title={name} className="no-underline">{name.slice(0, 3)}</abbr></th>)}</tr>
      </thead>
      <tbody>
        {weeks.map((week) => (
          <tr key={week[0]}>
            {week.map((date) => {
              const own = items.filter((i) => occursOn(i, date))
              const chips = own.filter((i) => !i.routine).slice(0, VISIBLE)
              const isSelected = date === day
              return (
                <td key={date} className="border border-beige p-0 align-top">
                  <button
                    ref={isSelected ? selected : undefined}
                    type="button"
                    tabIndex={isSelected ? 0 : -1}
                    aria-current={date === today ? 'date' : undefined}
                    aria-pressed={isSelected}
                    onClick={() => onSelect(date)}
                    onKeyDown={onKeyDown}
                    className={cx('flex min-h-14 w-full flex-col items-start gap-1 p-1 text-left focus-visible:outline-offset-[-3px] sm:p-1.5 lg:min-h-28', isSelected ? 'bg-aviso-fondo' : 'hover:bg-yeso', date.slice(0, 7) !== day.slice(0, 7) && 'text-apagado')}
                  >
                    <span className={cx('grid min-w-7 place-items-center font-bold tabular-nums', date === today && 'bg-marino text-crema')}>
                      <span aria-hidden="true">{Number(date.slice(8))}</span>
                      <span className="sr-only">{formatDay(date)}. {own.length === 0 ? 'Sin nada' : own.length === 1 ? '1 cosa' : `${own.length} cosas`}</span>
                    </span>
                    {own.length > 0 && <span aria-hidden="true" className="bg-beige px-1.5 font-bold text-tinta lg:hidden">{own.length}</span>}
                    <span aria-hidden="true" className="grid w-full grid-cols-1 gap-0.5 max-lg:hidden">
                      {chips.map((item) => <Chip key={item.key} item={item} />)}
                      {own.length > chips.length && <span className="text-sm text-apagado">{chips.length > 0 ? 'y ' : ''}{own.length - chips.length} {chips.length > 0 ? 'más' : 'de rutina'}</span>}
                    </span>
                  </button>
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Chip({ item }: { item: AgendaItem }) {
  const { icon: Icon, text } = CATEGORIES[item.category]
  return (
    <span className={`flex items-center gap-1 text-sm leading-tight ${text}`}>
      <Icon className="size-3.5 shrink-0" />
      <span className={`truncate ${item.done ? 'line-through' : ''}`}>{item.title}</span>
    </span>
  )
}
