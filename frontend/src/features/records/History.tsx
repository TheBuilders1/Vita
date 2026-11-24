import { useState } from 'react'
import { useHome } from '@/app/providers/home'
import { useToday } from '@/hooks/useToday'
import { historyLines } from '@/services/history'
import type { FamilyRecord } from '@/types/records'
import { todayIso } from '@/utils/dates'
import { formatDate, formatNear } from '@/utils/format'

const PAGE = 10

/** Quién añadió, cambió o dio por hecho este registro, de lo último a lo primero. */
export function History({ record }: { record: FamilyRecord }) {
  const { members } = useHome()
  const today = useToday()
  const [shown, setShown] = useState(PAGE)
  const lines = historyLines(record, members)
  return (
    <details className="mt-5 border-2 border-beige">
      <summary className="min-h-12 px-4 py-2.5 font-bold">Quién ha cambiado esto{lines.length > 0 && ` (${lines.length})`}</summary>
      <ol className="grid grid-cols-1 gap-2 px-4 pb-4">
        {lines.slice(0, shown).map(({ at, text }, i) => <li key={`${at}-${lines.length - i}`} className="[overflow-wrap:anywhere]"><span className="block">{text}</span><span className="block text-apagado">{moment(at, today)}</span></li>)}
        {lines.length > shown && <li><button type="button" onClick={() => setShown(shown + PAGE)} className="min-h-11 font-bold underline underline-offset-4">Ver más cambios</button></li>}
        <li><span className="block">Se añadió a Vita</span><span className="block text-apagado">{moment(record.createdAt, today)}</span></li>
      </ol>
    </details>
  )
}

function moment(at: string, today: string): string {
  const date = new Date(at)
  const day = todayIso(date)
  const near = formatNear(day, today)
  const time = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  return `${/^(Hoy|Ayer)$/.test(near) ? near : formatDate(day)}, a las ${time}`
}
