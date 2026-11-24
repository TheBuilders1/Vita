import { FLOORS } from '@/modules/floors'
import type { FloorId } from '@/modules/types'

/** Botonera del ascensor para pantallas pequeñas: las cinco plantas siempre a un toque. */
export function LiftBar({ selected, onSelect }: { selected: FloorId | null; onSelect: (floor: FloorId) => void }) {
  return (
    <div role="group" aria-label="Ascensor" className="on-dark flex gap-1 bg-marino p-1 lg:hidden">
      {FLOORS.map((f) => (
        <button key={f.id} type="button" aria-pressed={f.id === selected} onClick={() => onSelect(f.id)} aria-label={`Planta ${f.level}: ${f.name}`}
          className={`min-h-12 flex-1 text-xl font-bold focus-visible:outline-offset-[-4px] ${f.id === selected ? 'bg-crema text-tinta' : 'text-crema'}`}>
          {f.level}
        </button>
      ))}
    </div>
  )
}
