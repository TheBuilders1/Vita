import type { MeshBuilder } from '../geometry/MeshBuilder'
import type { Tile } from '../materials/tiles'

export interface RoomDesign {
  readonly floor: Tile
  readonly wall: Tile
  /** Fondo del tabique izquierdo, en metros. 0 = espacio abierto con la zona anterior. */
  readonly partition: number
  /** Amuebla la zona; w es su ancho. */
  readonly furnish: (b: MeshBuilder, w: number) => void
}
