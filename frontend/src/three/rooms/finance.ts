import { bookStack, bookcase, chair, counter, floorLamp, monitor, mug, onWall, pendant, plant, rug, stool, table, tableLamp, windowOn } from '../models/common'
import { TILE } from '../materials/tiles'
import type { RoomDesign } from './types'

export const FINANCE_ROOMS = {
  finances: {
    floor: TILE.walnut, wall: TILE.plasterNavy, partition: 0,
    furnish(b) {
      bookcase(b, 0.85, 1.4, 1.65, [TILE.booksB, TILE.booksD, TILE.booksA])
      windowOn(b, 2.5)
      onWall(b, 3.75, 0.8, 1, 0.62, TILE.screenChart)
      rug(b, 2.45, 1.75, 3.4, 1.7, TILE.rugRust)
      // Escritorio de despacho
      for (const x of [1.75, 3.15]) b.box(x, 0, 1.55, 0.5, 0.7, 0.75, TILE.darkwood, { front: TILE.drawersWood })
      b.box(2.45, 0.35, 1.25, 0.9, 0.35, 0.06, TILE.darkwood)
      b.box(2.45, 0.7, 1.55, 2, 0.07, 0.88, TILE.darkwood)
      b.box(2.45, 0.772, 1.65, 0.8, 0.01, 0.5, TILE.olive)
      monitor(b, 1.95, 0.77, 1.35, TILE.screenChart)
      b.box(2.5, 0.78, 1.65, 0.42, 0.02, 0.26, TILE.paper, { top: TILE.ledger })
      // Calculadora
      b.box(2.95, 0.77, 1.7, 0.2, 0.06, 0.28, TILE.darkmetal, { top: TILE.keyboard }); b.box(2.95, 0.83, 1.62, 0.15, 0.012, 0.06, TILE.water)
      tableLamp(b, 3.25, 0.77, 1.35, TILE.olive); mug(b, 2.2, 0.77, 1.85, TILE.rust)
      chair(b, 2.45, 0.8, 0, TILE.leather)
      chair(b, 2.75, 2.5, Math.PI - 0.2, TILE.navy)
      plant(b, 4.35, 0.5, 1.15)
    },
  },
  documents: {
    floor: TILE.walnut, wall: TILE.plaster, partition: 0.85,
    furnish(b) {
      for (let i = 0; i < 4; i++) b.box(0.6 + i * 0.64, 0, 0.3, 0.6, 1.3, 0.56, i % 2 ? TILE.navy : TILE.metal, { front: i % 2 ? TILE.drawersNavy : TILE.drawersMetal })
      b.box(0.9, 1.3, 0.3, 0.4, 0.26, 0.32, TILE.beige, { front: TILE.paper }); b.box(1.9, 1.3, 0.3, 0.46, 0.2, 0.36, TILE.olive)
      onWall(b, 3.35, 0.95, 0.9, 0.62, TILE.cork)
      table(b, 2.6, 1.6, 1.5, 0.75, TILE.wood)
      b.box(2.3, 0.74, 1.6, 0.34, 0.16, 0.26, TILE.beige, { front: TILE.paper, top: TILE.paper })
      b.box(2.85, 0.74, 1.65, 0.28, 0.02, 0.2, TILE.rust); b.box(2.88, 0.76, 1.67, 0.24, 0.02, 0.17, TILE.navy)
      b.cylinder(3.2, 0.74, 1.5, 0.06, 0.1, TILE.darkwood)
      stool(b, 2.35, 2.3, TILE.wood); b.box(0.75, 0, 1.6, 0.5, 0.34, 0.4, TILE.beige, { top: TILE.paper }); b.box(0.75, 0.34, 1.6, 0.46, 0.28, 0.36, TILE.wood, { top: TILE.paper })
      pendant(b, 2.6, 1.6, 1.95, TILE.darkmetal)
    },
  },
  savings: {
    floor: TILE.walnut, wall: TILE.plasterOlive, partition: 0.6,
    furnish(b) {
      // Caja fuerte
      b.box(1.1, 0.06, 0.45, 1.15, 1.15, 0.8, TILE.darkmetal, { front: TILE.safe })
      for (const x of [0.65, 1.55]) b.box(x, 0, 0.45, 0.16, 0.06, 0.6, TILE.darkmetal)
      onWall(b, 2.5, 0.95, 0.8, 0.66, TILE.paintingB)
      bookcase(b, 2.5, 1.2, 0.8, [TILE.booksC], TILE.darkwood)
      // Hucha grande
      b.box(2.3, 0, 1.7, 0.9, 0.4, 0.6, TILE.wood, { front: TILE.drawersWood })
      b.blob(2.28, 0.66, 1.7, 0.32, 0.25, 0.24, TILE.terracotta, { tint: '#ffd9c9' })
      b.blob(2.58, 0.68, 1.72, 0.13, 0.13, 0.13, TILE.terracotta, { tint: '#ffd9c9' }); b.box(2.71, 0.62, 1.73, 0.07, 0.1, 0.12, TILE.terracotta, { tint: '#f2c1ae' })
      for (const dx of [-0.15, 0.15]) for (const dz of [-0.1, 0.1]) b.box(2.28 + dx, 0.4, 1.7 + dz, 0.08, 0.1, 0.08, TILE.terracotta)
      b.box(2.28, 0.9, 1.7, 0.16, 0.015, 0.04, TILE.darkmetal)
      for (let i = 0; i < 4; i++) b.cylinder(1.9 + (i % 2) * 0.06, 0.4 + i * 0.03, 1.85, 0.07, 0.03, TILE.brass)
      plant(b, 0.5, 1.7, 0.9)
    },
  },
  kidsMoney: {
    floor: TILE.oak, wall: TILE.plasterSand, partition: 0.85,
    furnish(b) {
      windowOn(b, 1.2)
      onWall(b, 2.5, 0.95, 0.46, 0.5, TILE.photo); onWall(b, 3.1, 1.02, 0.6, 0.46, TILE.paintingA)
      counter(b, 3.6, 1.5, [TILE.cabinetBlue, TILE.drawersWood, TILE.cabinetBlue], TILE.wood, { h: 0.7, depth: 0.42, side: TILE.plasterBlue })
      // Tres frascos: gastar, ahorrar y compartir
      for (const [x, t, h] of [[3.15, TILE.brass, 0.18], [3.55, TILE.brass, 0.1], [3.95, TILE.brass, 0.24]] as const) { b.cylinder(x, 0.7, 0.24, 0.12, h, t); b.cylinder(x, 0.7 + h, 0.24, 0.12, 0.3 - h, TILE.water); b.cylinder(x, 1, 0.24, 0.13, 0.04, TILE.darkwood) }
      rug(b, 2.2, 1.8, 2.8, 1.5, TILE.rugNavy)
      table(b, 2.1, 1.75, 1.2, 0.7, TILE.wood, 0.56)
      b.box(1.85, 0.56, 1.75, 0.34, 0.02, 0.24, TILE.paper, { top: TILE.ledger })
      for (let i = 0; i < 5; i++) b.cylinder(2.35 + (i % 3) * 0.12, 0.56 + (i > 2 ? 0.03 : 0), 1.7 + (i % 2) * 0.12, 0.055, 0.035, TILE.brass)
      chair(b, 2.1, 1.15, 0, TILE.rust); chair(b, 1.75, 2.45, Math.PI + 0.3, TILE.olive)
      bookStack(b, 3.5, 0, 1.9, [TILE.rust, TILE.navy, TILE.olive, TILE.beige])
      floorLamp(b, 0.55, 0.6, 1.2)
    },
  },
} satisfies Record<string, RoomDesign>
