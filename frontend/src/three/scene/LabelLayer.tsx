import type { CSSProperties, Ref } from 'react'
import { CountBadge } from '@/components/ui/Badge'
import { getModule } from '@/modules/registry'
import { projectPoint } from '../camera/framing'
import { BUILDING, floorY } from '../config'
import { ZONES, type Zone } from '../rooms/layout'
import type { BuildingProps } from '../types'

/**
 * Rótulos en HTML sobre el lienzo. La cámara escribe su posición en variables CSS
 * (--vx, --vy, --vz) y el navegador los coloca sin volver a renderizar React.
 * Son visuales: los mismos nombres están en el directorio accesible.
 */
export function LabelLayer({ ref, rooms, moduleId, hovered }: Pick<BuildingProps, 'rooms' | 'moduleId' | 'hovered'> & { ref: Ref<HTMLDivElement> }) {
  const status = new Map(rooms.map((r) => [r.moduleId, r]))
  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 overflow-hidden">
      {ZONES.map((zone) => {
        const room = status.get(zone.moduleId)
        if (room?.enabled === false) return null
        return <ZoneLabel key={zone.moduleId} zone={zone} pending={room?.pending ?? 0} named={zone.moduleId === hovered || zone.moduleId === moduleId} />
      })}
    </div>
  )
}

function ZoneLabel({ zone, pending, named }: { zone: Zone; pending: number; named: boolean }) {
  if (!named && pending === 0) return null
  const [x, y] = projectPoint([(zone.x0 + zone.x1) / 2, floorY(zone.level) + 2.1, BUILDING.depth / 2])
  const style: CSSProperties = {
    transform: `translate(-50%, -50%) translate(calc((${x.toFixed(3)} - var(--vx)) * var(--vz) * 1px), calc((var(--vy) - ${y.toFixed(3)}) * var(--vz) * 1px))${named ? '' : ' scale(clamp(0.6, calc(var(--vz) / 34), 1))'}`,
  }
  return (
    <div style={style} className={`absolute top-1/2 left-1/2 flex items-center font-bold whitespace-nowrap ${named ? 'z-10 bg-marino px-3 py-1 text-crema' : ''}`}>
      {named && <span>{getModule(zone.moduleId).name}</span>}
      <CountBadge count={pending} label={pending === 1 ? 'pendiente' : 'pendientes'} className={`bg-aviso-fondo text-tinta ${named ? 'ml-3' : ''}`} />
    </div>
  )
}
