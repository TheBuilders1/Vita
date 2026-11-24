import { bookStack, bookcase, chair, counter, crate, floorLamp, monitor, onWall, pendant, plant, rug, stool, table, tableLamp, windowOn } from '../models/common'
import { TILE } from '../materials/tiles'
import type { RoomDesign } from './types'

const { booksA, booksB, booksC, booksD } = TILE

export const EDUCATION_ROOMS = {
  school: {
    floor: TILE.parquet, wall: TILE.plasterOlive, partition: 0,
    furnish(b) {
      onWall(b, 1.6, 0.72, 1.9, 1, TILE.blackboard)
      b.box(1.6, 0.68, 0.1, 1.9, 0.04, 0.12, TILE.wood)
      onWall(b, 3.1, 0.95, 0.5, 0.58, TILE.calendar)
      bookcase(b, 4.35, 1.4, 1.65, [booksA, booksB, booksC])
      rug(b, 2.3, 1.75, 3, 1.6, TILE.rugOlive)
      // Escritorio con ordenador, visto por delante
      table(b, 1.6, 1.5, 1.7, 0.75)
      monitor(b, 1.3, 0.74, 1.35, TILE.screenCode)
      b.box(1.3, 0.74, 1.66, 0.5, 0.02, 0.16, TILE.darkmetal, { top: TILE.keyboard })
      bookStack(b, 2.05, 0.74, 1.45)
      tableLamp(b, 2.3, 0.74, 1.3)
      chair(b, 1.35, 2.25, Math.PI + 0.25, TILE.navy)
      // Mochilas
      for (const [x, z, t] of [[3.15, 2.1, TILE.rust], [3.6, 2.35, TILE.navy]] as const) {
        b.box(x, 0, z, 0.4, 0.48, 0.24, t)
        b.box(x, 0.06, z + 0.15, 0.28, 0.22, 0.08, t, { tint: '#dcd4c6' })
        b.box(x, 0.46, z, 0.16, 0.08, 0.06, TILE.darkmetal)
      }
      pendant(b, 2.2, 1.6, 1.95, TILE.navy)
    },
  },
  grants: {
    floor: TILE.parquet, wall: TILE.plaster, partition: 0.6,
    furnish(b) {
      onWall(b, 1.6, 0.74, 1.5, 0.95, TILE.cork)
      counter(b, 1.6, 1.8, [TILE.drawersWood, TILE.cabinetWood, TILE.drawersWood], TILE.darkwood, { h: 0.68, depth: 0.45, side: TILE.wood })
      bookStack(b, 1, 0.68, 0.25, [TILE.paper, TILE.beige, TILE.paper, TILE.navy])
      b.box(1.75, 0.68, 0.25, 0.34, 0.12, 0.24, TILE.beige, { front: TILE.paper })
      tableLamp(b, 2.3, 0.68, 0.22, TILE.olive)
      onWall(b, 2.75, 1.05, 0.5, 0.42, TILE.certificate)
      // Birrete sobre un pedestal
      b.box(2.55, 0, 1.6, 0.5, 0.62, 0.5, TILE.wood, { front: TILE.cabinetWood })
      b.cylinder(2.55, 0.62, 1.6, 0.17, 0.1, TILE.navy)
      b.at(2.55, 0.72, 1.6, 0.5, (c) => c.box(0, 0, 0, 0.5, 0.04, 0.5, TILE.navy).box(0.2, -0.16, 0.2, 0.03, 0.16, 0.03, TILE.brass))
      chair(b, 0.95, 1.5, 0.4, TILE.olive)
    },
  },
  development: {
    floor: TILE.oak, wall: TILE.plasterSand, partition: 0.85,
    furnish(b) {
      onWall(b, 0.55, 0.15, 0.3, 1.3, TILE.growth, 0.03)
      windowOn(b, 1.8)
      bookcase(b, 3.55, 1.5, 0.95, [booksD, booksA], TILE.wood)
      b.blob(3.15, 1.08, 0.2, 0.13, 0.15, 0.12, TILE.leather, { tint: '#ffe9d2' })
      b.blob(3.15, 1.28, 0.2, 0.1, 0.1, 0.1, TILE.leather, { tint: '#ffe9d2' })
      for (const x of [3.6, 3.8, 3.95]) b.box(x, 0.95, 0.2, 0.14, 0.14, 0.14, x === 3.8 ? TILE.olive : TILE.rust)
      rug(b, 2.4, 1.75, 3, 1.7, TILE.rugNavy)
      // Mesa baja y bloques
      table(b, 1.7, 1.75, 1, 0.7, TILE.wood, 0.44)
      stool(b, 1.15, 2.25, TILE.olive, 0.28); stool(b, 2.3, 2.2, TILE.rust, 0.28)
      for (const [x, y, z, t] of [[1.5, 0.44, 1.65, TILE.rust], [1.66, 0.44, 1.75, TILE.navy], [1.56, 0.6, 1.7, TILE.olive], [2.0, 0.44, 1.8, TILE.beige]] as const) b.box(x, y, z, 0.15, 0.15, 0.15, t)
      // Tren de madera
      for (let i = 0; i < 3; i++) {
        b.box(3 + i * 0.36, 0.06, 2.2, 0.3, 0.16, 0.2, [TILE.rust, TILE.wood, TILE.olive][i]!)
        for (const dx of [-0.09, 0.09]) b.box(3 + i * 0.36 + dx, 0.02, 2.31, 0.09, 0.09, 0.03, TILE.darkwood)
      }
      b.cylinder(2.92, 0.22, 2.2, 0.05, 0.14, TILE.darkmetal, { segments: 6 })
      plant(b, 4.6, 0.5, 1.2)
    },
  },
  bookings: {
    floor: TILE.tilesWarm, wall: TILE.plasterBlue, partition: 0.85,
    furnish(b) {
      // Mostrador con tablón de actividades
      onWall(b, 1.75, 0.95, 1.1, 0.72, TILE.map)
      onWall(b, 2.85, 0.98, 0.44, 0.52, TILE.calendar)
      for (const [i, t] of [TILE.cabinetBlue, TILE.cabinetBlue, TILE.cabinetBlue].entries()) b.box(1.1 + i * 0.62, 0, 1.25, 0.6, 0.86, 0.5, TILE.plasterBlue, { front: t })
      b.box(1.72, 0.86, 1.25, 2, 0.06, 0.62, TILE.wood)
      b.box(1.3, 0.92, 1.25, 0.26, 0.02, 0.2, TILE.paper, { top: TILE.ledger })
      b.cylinder(2.45, 0.92, 1.3, 0.06, 0.06, TILE.brass, { topRadius: 0.02 })
      b.box(1.8, 0.92, 1.2, 0.3, 0.2, 0.05, TILE.darkwood, { front: TILE.certificate })
      // Percheros con chaquetas
      b.box(0.7, 1.3, 0.04, 0.9, 0.08, 0.06, TILE.darkwood)
      for (const [x, t] of [[0.45, TILE.olive], [0.75, TILE.rust], [1, TILE.navy]] as const) b.box(x, 0.8, 0.12, 0.22, 0.5, 0.12, t)
      crate(b, 2.9, 0, 2, 0.5, 0.3, 0.36, TILE.wood)
      for (const x of [2.8, 2.98]) b.blob(x, 0.36, 2, 0.11, 0.11, 0.11, x < 2.9 ? TILE.rust : TILE.linen)
      floorLamp(b, 3.2, 0.5, 1.2)
    },
  },
} satisfies Record<string, RoomDesign>
