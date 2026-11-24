import type { FloorId, ModuleId } from '@/modules/types'

export interface RoomStatus { readonly moduleId: ModuleId; readonly pending: number; readonly enabled: boolean }

/** Contrato entre la app y el edificio: no conoce datos, formularios ni permisos. */
export interface BuildingProps {
  readonly rooms: readonly RoomStatus[]
  readonly floorId: FloorId | null
  readonly moduleId: ModuleId | null
  readonly hovered: ModuleId | null
  readonly onHover: (moduleId: ModuleId | null) => void
  readonly onSelectFloor: (floorId: FloorId) => void
  readonly onSelectModule: (moduleId: ModuleId) => void
}
