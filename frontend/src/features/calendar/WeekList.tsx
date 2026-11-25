import { occursOn, type AgendaItem } from '@/services/agenda'
import { formatDay } from '@/utils/format'
import { AgendaRow } from './AgendaRow'

/** Siete días con sitio para leer: en columnas si caben, apilados si no. */
export function WeekList({ days, today, items }: { days: readonly string[]; today: string; items: readonly AgendaItem[] }) {
  return (
    <ol className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {days.map((day) => {
        const own = items.filter((i) => occursOn(i, day))
        return (
          <li key={day} className={`min-w-0 border border-borde p-3 shadow-panel ${day === today ? 'bg-aviso-fondo' : 'bg-crema'}`}>
            <h3 className="mb-3 border-b-2 border-marino pb-2 text-xl font-bold">{formatDay(day)}{day === today && <span className="font-normal"> (hoy)</span>}</h3>
            {own.length === 0 ? <p className="text-apagado">Nada previsto</p> : <ul className="grid grid-cols-1 gap-2">{own.map((item) => <AgendaRow key={item.key} item={item} />)}</ul>}
          </li>
        )
      })}
    </ol>
  )
}
