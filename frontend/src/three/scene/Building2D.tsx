import { CountBadge } from '@/components/ui/Badge'
import { ModuleIcon } from '@/components/ui/ModuleIcon'
import { FLOORS } from '@/modules/floors'
import { getModule } from '@/modules/registry'
import { cx } from '@/utils/cx'
import { zonesOnLevel } from '../rooms/layout'
import type { BuildingProps } from '../types'

/** El mismo edificio en HTML: sin WebGL, sin movimiento y con teclado. En pantallas pequeñas deja sitio a la habitación abierta. */
export function Building2D({ rooms, moduleId, onSelectModule }: Pick<BuildingProps, 'rooms' | 'moduleId' | 'onSelectModule'>) {
  const status = new Map(rooms.map((r) => [r.moduleId, r]))
  return (
    <div role="group" aria-label="Edificio, vista sencilla" className={cx('border-x-8 border-t-8 border-madera-honda bg-madera-honda', moduleId && 'max-lg:hidden')}>
      {FLOORS.toReversed().map((floor) => (
        <section key={floor.id} aria-label={`Planta ${floor.level}: ${floor.name}`} className="mb-2 bg-crema p-3">
          <h2 className="mb-2 font-bold">{floor.level}. {floor.name}</h2>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(13rem,100%),1fr))] gap-2">
            {zonesOnLevel(floor.level).map(({ moduleId: id }) => {
              const room = status.get(id)
              const count = room?.pending ?? 0
              return (
                <li key={id}>
                  <button
                    type="button"
                    disabled={room?.enabled === false}
                    aria-current={id === moduleId ? 'true' : undefined}
                    onClick={() => onSelectModule(id)}
                    className={cx('flex min-h-14 w-full items-center gap-2.5 border-2 border-borde px-3 py-2 text-left leading-tight disabled:opacity-60', id === moduleId ? 'bg-marino text-crema' : 'bg-yeso hover:bg-beige')}
                  >
                    <ModuleIcon id={id} />
                    <span className="min-w-0 flex-1 hyphens-auto">{getModule(id).name}</span>
                    <CountBadge count={count} label={count === 1 ? 'pendiente' : 'pendientes'} />
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
