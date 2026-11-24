import { CountBadge } from '@/components/ui/Badge'
import { ModuleIcon } from '@/components/ui/ModuleIcon'
import { FLOORS } from '@/modules/floors'
import { getModule, modulesOnFloor } from '@/modules/registry'
import type { FloorId, ModuleId } from '@/modules/types'
import { cx } from '@/utils/cx'

interface FloorDirectoryProps {
  selected: FloorId | null
  hovered: ModuleId | null
  onSelect: (floor: FloorId) => void
  onHover: (moduleId: ModuleId | null) => void
  onSelectModule: (moduleId: ModuleId) => void
  rooms: readonly { readonly moduleId: ModuleId; readonly pending: number; readonly enabled: boolean }[]
}

const TOP_DOWN = FLOORS.toReversed()

/** El directorio del portal: plantas en el orden del edificio y, en la elegida, sus habitaciones. */
export function FloorDirectory({ selected, hovered, onSelect, onHover, onSelectModule, rooms }: FloorDirectoryProps) {
  return (
    <nav aria-label="Plantas" className="on-dark pixel-edge bg-marino p-2 [--edge:var(--color-marino-hondo)]">
      <ol className="grid grid-cols-1 gap-1">
        {TOP_DOWN.map((floor) => {
          const isSelected = floor.id === selected
          const open = rooms.filter((r) => r.enabled && getModule(r.moduleId).floor === floor.id)
          const count = open.reduce((sum, r) => sum + r.pending, 0)
          return (
            <li key={floor.id} className={isSelected ? 'bg-crema text-tinta' : undefined}>
              <button
                type="button"
                aria-current={isSelected ? 'true' : undefined}
                aria-expanded={isSelected}
                onClick={() => onSelect(floor.id)}
                className={cx('flex min-h-16 w-full items-center gap-4 px-3 py-2 text-left focus-visible:outline-offset-[-3px]', !isSelected && 'text-crema hover:bg-marino-hondo')}
              >
                <span aria-hidden="true" className={cx('grid size-11 shrink-0 place-items-center text-xl font-bold', isSelected ? FLOOR_LAMP[floor.id] : 'bg-marino-hondo text-beige')}>
                  {floor.level}
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="sr-only">Planta {floor.level}. </span>
                  <span className="block font-bold">{floor.name}</span>
                  <span className={cx('block', isSelected ? 'text-apagado' : 'text-beige')}>{floor.place}</span>
                </span>
                <CountBadge count={count} label={count === 1 ? 'pendiente' : 'pendientes'} className={isSelected ? 'bg-madera text-crema' : 'bg-beige text-tinta'} />
              </button>
              {isSelected && (
                <ul className="px-2 pb-2">
                  {modulesOnFloor(floor.id).filter((m) => open.some((r) => r.moduleId === m.id)).map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => onSelectModule(m.id)}
                        onPointerEnter={(e) => { if (e.pointerType !== 'touch') onHover(m.id) }}
                        onPointerLeave={() => onHover(null)}
                        onFocus={() => onHover(m.id)}
                        onBlur={() => onHover(null)}
                        className={cx('flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left font-bold focus-visible:outline-foco! focus-visible:outline-offset-[-3px]', hovered === m.id && 'bg-beige')}
                      >
                        <ModuleIcon id={m.id} />
                        <span className="flex-1">{m.name}</span>
                        <CountBadge count={open.find((r) => r.moduleId === m.id)?.pending ?? 0} label="pendientes" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

const FLOOR_LAMP: Record<FloorId, string> = {
  food: 'bg-floor-food text-crema',
  education: 'bg-floor-education text-crema',
  health: 'bg-floor-health text-crema',
  finance: 'bg-floor-finance text-crema',
  leisure: 'bg-floor-leisure text-crema',
}
