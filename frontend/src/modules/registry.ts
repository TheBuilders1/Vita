import { EDUCATION_MODULES } from './education'
import { FINANCE_MODULES } from './finance'
import { FOOD_MODULES } from './food'
import { HEALTH_MODULES } from './health'
import { LEISURE_MODULES } from './leisure'
import { TRANSVERSAL_MODULES } from './planner'
import type { FloorId, ModuleDef, ModuleId, RecordTypeDef } from './types'

export const MODULES: readonly ModuleDef[] = [
  ...FOOD_MODULES, ...EDUCATION_MODULES, ...HEALTH_MODULES, ...FINANCE_MODULES, ...LEISURE_MODULES, ...TRANSVERSAL_MODULES,
]
export const RECORD_TYPES: readonly RecordTypeDef[] = MODULES.flatMap((m) => m.recordTypes)

const modulesById = new Map(MODULES.map((m) => [m.id, m]))
const typesById = new Map(RECORD_TYPES.map((t) => [t.id, t]))

export function getModule(id: ModuleId): ModuleDef {
  const found = modulesById.get(id)
  if (!found) throw new Error(`No existe el módulo "${id}"`)
  return found
}

export function getRecordType(id: string): RecordTypeDef {
  const found = typesById.get(id)
  if (!found) throw new Error(`No existe el tipo de registro "${id}"`)
  return found
}

export const modulesOnFloor = (floor: FloorId): ModuleDef[] => MODULES.filter((m) => m.floor === floor)
