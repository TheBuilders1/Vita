import { bookStack, bookcase, chair, counter, crate, floorLamp, monitor, mug, onWall, plant, rug, stool, table, tableLamp } from '../models/common'
import { TILE } from '../materials/tiles'
import type { RoomDesign } from './types'

export const LEISURE_ROOMS = {
  outings: {
    floor: TILE.oak, wall: TILE.plasterOlive, partition: 0,
    furnish(b) {
      onWall(b, 1.2, 0.86, 1.2, 0.82, TILE.map)
      // Tienda de campaña
      b.at(1.15, 0, 1.6, 0, (c) => { c.gable(0, 0, 0, 1.5, 1, 1.4, TILE.olive, TILE.beige) })
      b.box(1.92, 0, 1.6, 0.02, 0.6, 0.4, TILE.darkmetal)
      // Mochila y maleta
      b.box(2.4, 0, 0.45, 0.6, 0.62, 0.3, TILE.leather); b.box(2.4, 0.62, 0.45, 0.2, 0.07, 0.06, TILE.darkwood); b.box(2.4, 0.18, 0.61, 0.62, 0.05, 0.02, TILE.brass)
      b.box(2.42, 0.69, 0.42, 0.44, 0.3, 0.26, TILE.navy)
      b.cylinder(2.45, 0, 1.9, 0.18, 0.3, TILE.rust, { topRadius: 0.16 }); b.box(2.45, 0.3, 1.9, 0.12, 0.08, 0.12, TILE.darkmetal)
      b.blob(2.1, 0.17, 2.4, 0.17, 0.17, 0.17, TILE.linen, { tint: '#f0d6b0' })
    },
  },
  album: {
    floor: TILE.oak, wall: TILE.plasterClay, partition: 0.6,
    furnish(b) {
      // Pared de fotografías
      const frames = [[0.6, 1.2, TILE.photo, 0.42], [1.15, 1.08, TILE.photoB, 0.56], [1.8, 1.2, TILE.paintingA, 0.5], [2.4, 1.1, TILE.photo, 0.52], [2.95, 1.24, TILE.photoB, 0.4], [3.45, 1.08, TILE.paintingC, 0.5]] as const
      for (const [x, y, t, s] of frames) onWall(b, x, y, s, s * (t.height / t.width), t)
      // Sofá
      b.box(1.9, 0.1, 0.62, 2.4, 0.3, 0.8, TILE.navy)
      b.box(1.9, 0.4, 0.3, 2.4, 0.46, 0.22, TILE.navy)
      for (const x of [0.62, 3.18]) b.box(x, 0.1, 0.62, 0.22, 0.52, 0.8, TILE.navy)
      for (const x of [1.15, 1.9, 2.65]) b.box(x, 0.4, 0.72, 0.72, 0.1, 0.6, TILE.navy, { tint: '#e6ebf2' })
      b.box(1, 0.5, 0.52, 0.36, 0.32, 0.12, TILE.rust); b.box(2.75, 0.5, 0.52, 0.36, 0.32, 0.12, TILE.beige)
      for (const x of [0.8, 3]) b.box(x, 0, 0.62, 0.1, 0.1, 0.6, TILE.darkwood)
      rug(b, 2, 1.8, 3.2, 1.6, TILE.rugRust)
      table(b, 1.95, 1.75, 1.2, 0.62, TILE.darkwood, 0.4)
      b.box(1.75, 0.4, 1.75, 0.44, 0.05, 0.3, TILE.rust); b.box(1.76, 0.45, 1.75, 0.4, 0.012, 0.27, TILE.photo, { top: TILE.photo })
      mug(b, 2.3, 0.4, 1.85)
      floorLamp(b, 3.85, 0.55, 1.3)
    },
  },
  digitalInfo: {
    floor: TILE.oak, wall: TILE.plasterClay, partition: 0,
    furnish(b) {
      counter(b, 1.45, 2, [TILE.cabinetWood, TILE.cabinetWood, TILE.cabinetWood, TILE.cabinetWood], TILE.darkwood, { h: 0.52, depth: 0.45, side: TILE.wood })
      b.box(1.45, 0.52, 0.24, 0.6, 0.04, 0.24, TILE.darkmetal)
      b.box(1.45, 0.56, 0.22, 1.5, 0.88, 0.08, TILE.darkmetal, { front: TILE.tv, glow: 0.18 })
      bookStack(b, 0.65, 0.52, 0.25, [TILE.paper, TILE.paper])
      // Butaca, periódicos y lupa
      b.box(0.75, 0.1, 1.85, 0.75, 0.3, 0.7, TILE.olive); b.box(0.75, 0.4, 2.13, 0.75, 0.42, 0.16, TILE.olive)
      for (const x of [0.4, 1.1]) b.box(x, 0.1, 1.85, 0.14, 0.48, 0.7, TILE.olive)
      table(b, 1.95, 1.75, 0.66, 0.56, TILE.wood, 0.46)
      for (const [i, dy] of [0, 0.025, 0.05].entries()) b.box(1.92 + i * 0.03, 0.46 + dy, 1.75, 0.42, 0.02, 0.3, TILE.paper, { top: TILE.newspaper })
      plant(b, 2.6, 1.2, 0.9)
    },
  },
  technology: {
    floor: TILE.parquet, wall: TILE.plasterBlue, partition: 0.85,
    furnish(b) {
      onWall(b, 0.75, 1.1, 0.6, 0.5, TILE.paintingB)
      b.box(2, 1.2, 0.14, 1.1, 0.04, 0.26, TILE.wood); b.box(2, 1.24, 0.12, 0.9, 0.3, 0.16, TILE.darkwood, { front: TILE.booksC })
      table(b, 1.4, 0.75, 2.1, 0.7, TILE.wood)
      monitor(b, 1, 0.74, 0.55, TILE.screenCode, 0.7); monitor(b, 1.75, 0.74, 0.58, TILE.screenChart, 0.6)
      b.box(1.1, 0.74, 0.92, 0.5, 0.02, 0.16, TILE.darkmetal, { top: TILE.keyboard }); b.box(1.48, 0.74, 0.94, 0.08, 0.03, 0.12, TILE.darkmetal)
      // Tableta y móvil cargando
      b.box(2.2, 0.74, 0.85, 0.2, 0.02, 0.28, TILE.darkmetal, { top: TILE.screenLock })
      tableLamp(b, 0.5, 0.74, 0.6)
      b.box(0.62, 0, 0.85, 0.22, 0.48, 0.44, TILE.darkmetal)
      chair(b, 1.3, 1.6, Math.PI, TILE.navy, TILE.darkmetal)
      // Consola con mando
      rug(b, 1.9, 2.2, 1.4, 0.9, TILE.rugOlive)
      b.box(1.8, 0.03, 2.2, 0.34, 0.08, 0.24, TILE.darkmetal); b.box(2.2, 0.03, 2.3, 0.22, 0.06, 0.12, TILE.linen)
    },
  },
  cybersecurity: {
    floor: TILE.tiles, wall: TILE.plasterNavy, partition: 0.85,
    furnish(b) {
      b.box(0.55, 0, 0.35, 0.72, 1.35, 0.6, TILE.darkmetal, { front: TILE.server })
      onWall(b, 1.2, 0.92, 0.5, 0.58, TILE.shield)
      // Consola con candado y router
      table(b, 1.3, 1.45, 1, 0.55, TILE.wood)
      monitor(b, 1.15, 0.74, 1.4, TILE.screenLock, 0.5)
      b.box(1.6, 0.74, 1.4, 0.26, 0.06, 0.18, TILE.white); for (const dx of [-0.09, 0.09]) b.box(1.6 + dx, 0.8, 1.34, 0.02, 0.22, 0.02, TILE.darkmetal)
      stool(b, 1.2, 2.15, TILE.navy)
    },
  },
  shopping: {
    floor: TILE.tilesWarm, wall: TILE.plasterSand, partition: 0.6,
    furnish(b) {
      bookcase(b, 1, 1.5, 1.4, [TILE.pantry, TILE.pantry, TILE.pantry], TILE.wood)
      // Carrito
      b.at(0.95, 0, 1.6, -0.3, (c) => {
        c.box(0, 0.34, 0, 0.74, 0.36, 0.46, TILE.metal, { top: TILE.greyCloth }); c.box(0, 0.2, 0, 0.6, 0.04, 0.38, TILE.darkmetal)
        for (const sx of [-0.28, 0.28]) for (const sz of [-0.17, 0.17]) c.box(sx, 0, sz, 0.1, 0.12, 0.06, TILE.darkmetal)
        for (const sx of [-0.28, 0.28]) c.box(sx, 0.1, 0, 0.04, 0.26, 0.04, TILE.darkmetal)
        c.box(-0.46, 0.72, 0, 0.05, 0.05, 0.46, TILE.rust); c.box(-0.4, 0.62, 0, 0.06, 0.12, 0.04, TILE.darkmetal)
        for (const [x, z, t] of [[-0.18, 0, TILE.rust], [0.08, -0.08, TILE.leavesDry], [0.2, 0.1, TILE.linen]] as const) c.blob(x, 0.74, z, 0.12, 0.1, 0.12, t)
      })
      for (const [x, z, t] of [[1.62, 1.9, TILE.beige], [1.8, 1.55, TILE.olive]] as const) { b.box(x, 0, z, 0.3, 0.42, 0.2, t); b.box(x, 0.42, z, 0.14, 0.1, 0.03, TILE.darkwood); b.blob(x, 0.44, z, 0.1, 0.1, 0.08, TILE.leaves) }
      crate(b, 1.75, 0, 0.75, 0.4, 0.24, 0.3)
    },
  },
} satisfies Record<string, RoomDesign>
