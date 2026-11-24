import { useEffect, useRef, type KeyboardEvent } from 'react'
import { occursOn, type AgendaItem } from '@/services/agenda'
import { addDays, addMonths, startOfWeek } from '@/utils/dates'
import { cx } from '@/utils/cx'
import { formatDay, WEEKDAYS } from '@/utils/format'
import { CATEGORIES } from './categories'

interface MonthGridProps { weeks: readonly string[][]; day: string; today: string; items: readonly AgendaItem[]; onSelect: (day: string) => void }

const VISIBLE = 3
const DAY_INITIALS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const

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
        <tr>{WEEKDAYS.map((name, i) => (
          <th key={name} scope="col" className="px-1 py-2 text-left font-bold max-sm:px-0 max-sm:py-1 max-sm:text-center">
            <span className="sr-only">{name}</span>
            <abbr title={name} aria-hidden="true" className="no-underline sm:hidden">{DAY_INITIALS[i]}</abbr>
            <abbr title={name} aria-hidden="true" className="hidden no-underline sm:inline">{name.slice(0, 3)}</abbr>
          </th>
        ))}</tr>
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
                    className={cx('flex min-h-[44px] w-full flex-col items-center justify-center gap-0.5 px-0.5 py-0.5 text-left focus-visible:outline-offset-[-3px] sm:min-h-14 sm:items-start sm:justify-start sm:gap-1 sm:p-1.5 lg:min-h-28', isSelected ? 'bg-aviso-fondo max-sm:inset-ring-2 max-sm:inset-ring-marino' : 'hover:bg-yeso', date.slice(0, 7) !== day.slice(0, 7) && 'text-apagado')}
                  >
                    <span className={cx('grid min-w-0 max-w-full place-items-center font-bold tabular-nums max-sm:leading-tight sm:min-w-7', date === today && 'bg-marino text-crema max-sm:px-0.5')}>
                      <span aria-hidden="true" className="[overflow-wrap:anywhere]">{Number(date.slice(8))}</span>
                      <span className="sr-only">{formatDay(date)}. {own.length === 0 ? 'Sin nada' : own.length === 1 ? '1 cosa' : `${own.length} cosas`}</span>
                    </span>
                    {own.length > 0 && <>
                      <span aria-hidden="true" className="size-1.5 rounded-full border border-current bg-current sm:hidden" />
                      <span aria-hidden="true" className="hidden bg-beige px-1.5 font-bold text-tinta sm:max-lg:inline">{own.length}</span>
                    </>}
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
