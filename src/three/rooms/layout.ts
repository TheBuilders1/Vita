import { FLOORS } from '@/modules/floors'
import { getModule } from '@/modules/registry'
import type { ModuleId } from '@/modules/types'
import { BUILDING } from '../config'

/** Los módulos transversales no tienen habitación. */
export type RoomId = Exclude<ModuleId, 'planner'>
export interface Zone { readonly moduleId: RoomId; readonly level: number; readonly x0: number; readonly x1: number }

/** De izquierda a derecha, con el ancho de cada zona en metros. Cada planta suma el ancho útil. */
const PLAN: readonly (readonly (readonly [RoomId, number])[])[] = [
  [['cooking', 6], ['fridge', 3.4], ['diet', 7.6]],
  [['school', 5.2], ['grants', 3.2], ['development', 5], ['bookings', 3.6]],
  [['healthRecord', 2.9], ['dental', 2.1], ['medication', 2.1], ['vaccination', 2.1], ['care', 3.4], ['emergency', 2.1], ['pets', 2.3]],
  [['finances', 4.8], ['documents', 4.2], ['savings', 3.4], ['kidsMoney', 4.6]],
  [['outings', 3], ['album', 4.2], ['digitalInfo', 2.9], ['technology', 2.8], ['cybersecurity', 2], ['shopping', 2.1]],
]

export const ZONES: readonly Zone[] = PLAN.flatMap((plan, index) => {
  let x = BUILDING.coreWidth
  return plan.map(([moduleId, width]) => {
    const x0 = x
    x = Math.round((x + width) * 1000) / 1000
    return { moduleId, level: index + 1, x0, x1: x }
  })
})

const zonesById = new Map<ModuleId, Zone>(ZONES.map((z) => [z.moduleId, z]))

export const zonesOnLevel = (level: number) => ZONES.filter((z) => z.level === level)

export function zoneOf(moduleId: ModuleId): Zone {
  const zone = zonesById.get(moduleId)
  if (!zone) throw new Error(`El módulo "${moduleId}" no tiene habitación`)
  return zone
}

export const floorOnLevel = (level: number) => FLOORS.find((f) => f.level === level)!
export const floorOfModule = (moduleId: ModuleId) => FLOORS.find((f) => f.id === getModule(moduleId).floor)
