import { bowl, chair, counter, crate, mug, onWall, pendant, plant, pot, rug, stool, table, windowOn } from '../models/common'
import { TILE } from '../materials/tiles'
import type { RoomDesign } from './types'

const { cabinetOlive, cabinetCream, oven, marble } = TILE

export const FOOD_ROOMS = {
  cooking: {
    floor: TILE.checker, wall: TILE.plaster, partition: 0,
    furnish(b) {
      b.box(3, 0.88, 0.015, 6, 0.8, 0.03, TILE.subway)
      counter(b, 2.6, 4.9, [cabinetOlive, cabinetOlive, oven, cabinetOlive, cabinetOlive, cabinetOlive, cabinetOlive], marble, { side: TILE.olive })
      b.box(1.95, 0.885, 0.34, 0.66, 0.02, 0.5, TILE.darkmetal, { top: TILE.hob })
      pot(b, 1.82, 0.905, 0.26, 0.13)
      pot(b, 2.1, 0.905, 0.42, 0.1, TILE.rust)
      // Campana
      b.box(1.95, 1.62, 0.22, 0.8, 0.16, 0.44, TILE.metal)
      b.box(1.95, 1.78, 0.18, 0.4, 1.32, 0.34, TILE.metal)
      // Fregadero y ventana
      b.box(3.35, 0.885, 0.32, 0.62, 0.015, 0.42, TILE.metal, { top: TILE.darkmetal })
      b.box(3.35, 0.9, 0.1, 0.04, 0.26, 0.04, TILE.metal)
      b.box(3.35, 1.14, 0.17, 0.04, 0.04, 0.16, TILE.metal)
      windowOn(b, 3.35, 0.98, 0.85)
      // Baldas con botes
      b.box(0.75, 1.3, 0.14, 1.1, 0.04, 0.26, TILE.wood)
      b.box(0.75, 1.34, 0.12, 0.96, 0.32, 0.16, TILE.darkwood, { front: TILE.pantry })
      mug(b, 0.5, 0.88, 0.3); mug(b, 0.64, 0.88, 0.38, TILE.terracotta)
      b.box(1.05, 0.88, 0.28, 0.3, 0.04, 0.22, TILE.wood)
      b.blob(1.05, 0.97, 0.28, 0.12, 0.06, 0.08, TILE.leather, { tint: '#f3d9b0' })
      bowl(b, 4.6, 0.88, 0.3, 0.16, TILE.white, TILE.rust)
      // Isla
      b.box(2.5, 0, 1.75, 2, 0.84, 0.72, TILE.olive, { front: undefined })
      for (const x of [1.83, 2.5, 3.17]) b.box(x, 0.08, 2.1, 0.64, 0.74, 0.04, TILE.olive, { front: cabinetCream })
      b.box(2.5, 0.84, 1.75, 2.16, 0.06, 0.86, TILE.wood)
      b.box(2.05, 0.9, 1.75, 0.42, 0.03, 0.28, TILE.darkwood)
      for (const [x, z, t] of [[1.98, 1.72, '#ffffff'], [2.1, 1.78, '#e9efc9']] as const) b.blob(x, 0.96, z, 0.06, 0.05, 0.06, TILE.leaves, { tint: t })
      b.box(2.75, 0.9, 1.72, 0.34, 0.02, 0.24, TILE.paper, { top: TILE.ledger })
      stool(b, 1.95, 2.5, TILE.wood, 0.6); stool(b, 2.85, 2.5, TILE.wood, 0.6)
      pendant(b, 2, 1.75, 1.75, TILE.darkmetal); pendant(b, 3, 1.75, 1.75, TILE.darkmetal)
      plant(b, 5.5, 0.45, 1.1)
    },
  },
  fridge: {
    floor: TILE.checker, wall: TILE.plasterOlive, partition: 0.5,
    furnish(b) {
      b.box(0.85, 0.04, 0.38, 0.95, 1.86, 0.72, TILE.white, { front: TILE.fridgeDoor })
      b.box(0.85, 0, 0.36, 0.85, 0.05, 0.6, TILE.darkmetal)
      // Despensa abierta
      b.box(2.35, 0, 0.03, 1.5, 1.75, 0.05, TILE.darkwood)
      for (const x of [1.63, 3.07]) b.box(x, 0, 0.2, 0.06, 1.75, 0.4, TILE.darkwood)
      for (const y of [0.1, 0.62, 1.14]) {
        b.box(2.35, y, 0.2, 1.5, 0.05, 0.4, TILE.wood)
        b.box(2.35, y + 0.05, 0.18, 1.34, 0.36, 0.22, TILE.darkwood, { front: TILE.pantry })
      }
      b.box(2.35, 1.7, 0.2, 1.56, 0.05, 0.42, TILE.darkwood)
      crate(b, 0.6, 0, 1.5); crate(b, 1.12, 0, 1.6, 0.4, 0.24)
      for (const [x, z, t] of [[0.5, 1.45, '#ffffff'], [0.68, 1.55, '#e6c79a'], [1.05, 1.58, '#f2e2a8'], [1.2, 1.64, '#ffffff']] as const) b.blob(x, 0.3, z, 0.09, 0.08, 0.09, x < 0.9 ? TILE.terracotta : TILE.leavesDry, { tint: t })
      b.cylinder(2.6, 0, 1.5, 0.22, 0.4, TILE.wood, { topRadius: 0.26, top: TILE.linen })
    },
  },
  diet: {
    floor: TILE.oak, wall: TILE.plasterSand, partition: 0.85,
    furnish(b) {
      rug(b, 3.6, 1.75, 4.4, 1.9, TILE.rugRust)
      table(b, 3.6, 1.7, 2.5, 1, TILE.wood)
      b.box(3.6, 0.745, 1.7, 0.5, 0.012, 1.02, TILE.linen)
      for (const x of [2.75, 3.6, 4.45]) { chair(b, x, 1, 0, TILE.olive); chair(b, x, 2.4, Math.PI, TILE.olive) }
      for (const x of [2.75, 4.45]) for (const z of [1.45, 1.95]) { b.cylinder(x, 0.74, z, 0.15, 0.02, TILE.white); b.cylinder(x + 0.22, 0.74, z - 0.08, 0.04, 0.12, TILE.water, { segments: 6 }) }
      bowl(b, 3.6, 0.75, 1.7, 0.2, TILE.terracotta, TILE.leavesDry)
      pendant(b, 3.6, 1.7, 1.7, TILE.rust)
      // Aparador con pizarra de menús
      counter(b, 1.1, 1.7, [TILE.cabinetWood, TILE.drawersWood, TILE.cabinetWood], TILE.darkwood, { h: 0.8, depth: 0.42, side: TILE.wood })
      b.cylinder(0.6, 0.8, 0.22, 0.08, 0.2, TILE.water, { topRadius: 0.06 })
      b.blob(0.6, 1.12, 0.22, 0.13, 0.15, 0.13, TILE.leavesDry)
      bowl(b, 1.45, 0.8, 0.22, 0.14, TILE.navy)
      onWall(b, 1.15, 1.12, 0.6, 0.5, TILE.paintingA)
      windowOn(b, 3.2)
      windowOn(b, 4.7)
      onWall(b, 6.35, 0.78, 1.3, 0.82, TILE.blackboard)
      plant(b, 7.15, 0.55, 1.25)
    },
  },
} satisfies Record<string, RoomDesign>
