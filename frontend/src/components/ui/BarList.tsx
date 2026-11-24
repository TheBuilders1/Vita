import { TriangleAlert } from 'lucide-react'

export interface Bar { readonly key: string; readonly label: string; readonly value: number; readonly text: string; readonly limit?: number | undefined; readonly over?: boolean }

/**
 * Barras horizontales de una sola serie, con el valor escrito en cada una: hace también de tabla.
 * La raya marca el límite; pasarse se indica con icono y texto, no solo con color.
 */
export function BarList({ label, bars }: { label: string; bars: readonly Bar[] }) {
  const max = Math.max(1, ...bars.map((b) => Math.max(b.value, b.limit ?? 0)))
  const width = (value: number) => `${Math.max(0, (value / max) * 100)}%`
  return (
    <ul aria-label={label} className="grid grid-cols-1 gap-3">
      {bars.map((b) => (
        <li key={b.key}>
          <div className="flex flex-wrap justify-between gap-x-4"><span className="font-bold">{b.label}</span><span className="tabular-nums">{b.text}</span></div>
          <div aria-hidden="true" className="relative mt-1 h-3 bg-beige">
            <div className={`h-full ${b.over ? 'bg-peligro' : 'bg-marino'}`} style={{ width: width(b.value) }} />
            {b.limit !== undefined && <div className="absolute -top-1 h-5 w-0.5 bg-tinta" style={{ left: `calc(${width(b.limit)} - 2px)` }} />}
          </div>
          {b.over && <p className="mt-1 flex items-center gap-1.5 font-bold text-peligro"><TriangleAlert aria-hidden="true" className="size-4" />Presupuesto superado</p>}
        </li>
      ))}
    </ul>
  )
}
