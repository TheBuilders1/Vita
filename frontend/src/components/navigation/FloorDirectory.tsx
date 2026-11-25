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

/** Para devolver el foco al botón por el que se entró. */
export const floorButtonId = (id: FloorId) => `floor-${id}`
export const roomButtonId = (id: ModuleId) => `room-${id}`

export const nextFloor = (selected: FloorId | null, pressed: FloorId) => selected === pressed ? null : pressed

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
                id={floorButtonId(floor.id)}
                type="button"
                aria-current={isSelected ? 'true' : undefined}
                aria-expanded={isSelected}
                onClick={() => onSelect(floor.id)}
                className={cx('grid min-h-16 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-3 py-2 text-left max-[24rem]:grid-cols-[auto_minmax(0,1fr)] max-[24rem]:gap-2 max-[24rem]:px-2 focus-visible:outline-offset-[-3px]', !isSelected && 'text-crema hover:bg-marino-hondo')}
              >
                <span aria-hidden="true" className={cx('grid size-11 place-items-center max-[24rem]:size-9 max-[24rem]:justify-self-center text-xl font-bold', isSelected ? FLOOR_LAMP[floor.id] : 'bg-marino-hondo text-beige')}>
                  {floor.level}
                </span>
                <span className="leading-tight hyphens-auto max-[24rem]:col-start-2 max-[24rem]:row-span-2 max-[24rem]:row-start-1">
                  <span className="sr-only">Planta {floor.level}. </span>
                  <span className="block font-bold">{floor.name}</span>
                  <span className={cx('block', isSelected ? 'text-apagado' : 'text-beige')}>{floor.place}</span>
                </span>
                <CountBadge count={count} label={count === 1 ? 'pendiente' : 'pendientes'} className={cx('max-[24rem]:col-start-1 max-[24rem]:row-start-2 max-[24rem]:justify-self-center', isSelected ? 'bg-madera text-crema' : 'bg-beige text-tinta')} />
              </button>
              {isSelected && (
                <ul className="px-2 pb-2 max-[24rem]:px-0">
                  {modulesOnFloor(floor.id).filter((m) => open.some((r) => r.moduleId === m.id)).map((m) => (
                    <li key={m.id}>
                      <button
                        id={roomButtonId(m.id)}
                        type="button"
                        onClick={() => onSelectModule(m.id)}
                        onPointerEnter={(e) => { if (e.pointerType !== 'touch') onHover(m.id) }}
                        onPointerLeave={() => onHover(null)}
                        onFocus={() => onHover(m.id)}
                        onBlur={() => onHover(null)}
                        className={cx('flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left font-bold max-[24rem]:gap-2 max-[24rem]:px-2 focus-visible:outline-foco! focus-visible:outline-offset-[-3px]', hovered === m.id && 'bg-beige')}
                      >
                        <ModuleIcon id={m.id} />
                        <span className="min-w-0 flex-1 hyphens-auto">{m.name}</span>
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
