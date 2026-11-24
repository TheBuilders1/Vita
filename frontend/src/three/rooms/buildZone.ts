import type { BufferGeometry } from 'three'
import { BUILDING } from '../config'
import { MeshBuilder } from '../geometry/MeshBuilder'
import { TILE } from '../materials/tiles'
import { EDUCATION_ROOMS } from './education'
import { FINANCE_ROOMS } from './finance'
import { FOOD_ROOMS } from './food'
import { HEALTH_ROOMS } from './health'
import type { RoomId, Zone } from './layout'
import { LEISURE_ROOMS } from './leisure'
import type { RoomDesign } from './types'

/** El tipo obliga a amueblar todas: si falta una, no compila. */
const ROOM_DESIGNS: Record<RoomId, RoomDesign> = { ...FOOD_ROOMS, ...EDUCATION_ROOMS, ...HEALTH_ROOMS, ...FINANCE_ROOMS, ...LEISURE_ROOMS }

const CLEAR = BUILDING.storey - BUILDING.slab

/** Suelo, pared, tabique y muebles de una zona en una sola malla, con origen en su esquina trasera izquierda. */
export function buildZone({ moduleId, x0, x1 }: Zone): BufferGeometry {
  const w = x1 - x0
  const design = ROOM_DESIGNS[moduleId]
  const b = new MeshBuilder()
  b.box(w / 2, -0.04, BUILDING.depth / 2, w, 0.04, BUILDING.depth, design.floor)
  b.box(w / 2, 0, -BUILDING.wall / 2, w, CLEAR, BUILDING.wall, design.wall)
  b.box(w / 2, 0, 0.015, w, 0.1, 0.03, TILE.white)
  if (design.partition > 0) {
    b.box(0, 0, design.partition / 2, 0.12, CLEAR, design.partition, design.wall)
    b.box(0, 0, design.partition + 0.01, 0.15, CLEAR, 0.04, TILE.white)
  }
  design.furnish(b, w)
  return b.build()
}
