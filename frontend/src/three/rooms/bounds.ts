import type { Box } from '../camera/framing'
import { BUILDING, floorY } from '../config'
import type { Zone } from './layout'

export function zoneBox({ level, x0, x1 }: Zone): Box {
  const y = floorY(level)
  return { min: [x0 - 0.5, y - 0.2, 0], max: [x1 + 0.5, y + BUILDING.storey, BUILDING.depth] }
}

export function levelBox(level: number): Box {
  const y = floorY(level)
  return { min: [-0.4, y - 0.3, 0], max: [BUILDING.width + 0.4, y + BUILDING.storey, BUILDING.depth] }
}
