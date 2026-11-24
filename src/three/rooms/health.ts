import { bookStack, bowl, chair, counter, mug, onWall, plant, rug, stool, table, tableLamp, windowOn } from '../models/common'
import { TILE } from '../materials/tiles'
import type { RoomDesign } from './types'

export const HEALTH_ROOMS = {
  healthRecord: {
    floor: TILE.tiles, wall: TILE.plaster, partition: 0,
    furnish(b) {
      b.box(0.5, 0, 0.28, 0.6, 1.25, 0.52, TILE.metal, { front: TILE.drawersMetal })
      plant(b, 0.5, 0.28, 0.6, 1.25)
      onWall(b, 1.35, 0.85, 0.46, 0.74, TILE.eyechart)
      windowOn(b, 2.2, 0.9, 0.85)
      table(b, 1.75, 1.45, 1.5, 0.7, TILE.wood)
      b.box(1.5, 0.74, 1.45, 0.3, 0.02, 0.22, TILE.paper, { top: TILE.ledger })
      b.cylinder(2.2, 0.74, 1.35, 0.05, 0.03, TILE.darkmetal); b.box(2.2, 0.77, 1.35, 0.05, 0.22, 0.05, TILE.metal)
      bookStack(b, 1.2, 0.74, 1.35, [TILE.beige, TILE.navy])
      chair(b, 1.75, 0.85, 0, TILE.navy); chair(b, 1.6, 2.3, Math.PI - 0.3, TILE.olive)
    },
  },
  dental: {
    floor: TILE.tiles, wall: TILE.subway, partition: 0.6,
    furnish(b) {
      // Lavabo con espejo
      counter(b, 1.1, 1.2, [TILE.cabinetBlue, TILE.cabinetBlue], TILE.marble, { h: 0.78, depth: 0.5, side: TILE.plasterBlue })
      b.box(1.1, 0.785, 0.28, 0.6, 0.02, 0.34, TILE.white, { top: TILE.water })
      b.box(1.1, 0.8, 0.07, 0.05, 0.18, 0.05, TILE.brass); b.box(1.1, 0.95, 0.13, 0.05, 0.04, 0.14, TILE.brass)
      onWall(b, 1.1, 1.06, 0.6, 0.62, TILE.mirror)
      for (const [x, t] of [[0.62, TILE.olive], [0.7, TILE.rust], [0.78, TILE.navy]] as const) b.box(x, 0.88, 0.24, 0.025, 0.16, 0.025, t)
      b.cylinder(0.7, 0.78, 0.24, 0.08, 0.12, TILE.white)
      // Diente gigante: se reconoce de un vistazo
      b.box(1.45, 0, 1.7, 0.6, 0.06, 0.46, TILE.darkwood)
      for (const dx of [-0.12, 0.12]) b.cylinder(1.45 + dx, 0.06, 1.7, 0.05, 0.24, TILE.white, { topRadius: 0.13 })
      b.cylinder(1.45, 0.28, 1.7, 0.24, 0.22, TILE.white, { topRadius: 0.29 })
      for (const dx of [-0.14, 0.14]) b.blob(1.45 + dx, 0.5, 1.7, 0.17, 0.13, 0.24, TILE.white)
      stool(b, 0.6, 1.6, TILE.wood, 0.34)
    },
  },
  medication: {
    floor: TILE.tiles, wall: TILE.plasterOlive, partition: 0.6,
    furnish(b) {
      // Botiquín abierto
      b.box(1.05, 0.72, 0.13, 1, 0.98, 0.26, TILE.white, { front: TILE.medicines })
      b.at(1.58, 0.72, 0.3, -0.9, (c) => c.box(0.22, 0, 0, 0.46, 0.98, 0.04, TILE.white, { front: TILE.cabinetWhite }))
      onWall(b, 0.32, 1.1, 0.4, 0.4, TILE.cross)
      counter(b, 1.05, 1.4, [TILE.cabinetWhite, TILE.cabinetWhite], TILE.marble, { h: 0.6, depth: 0.42 })
      // Pastillero semanal y vaso
      table(b, 1.1, 1.65, 1, 0.6, TILE.wood)
      for (let i = 0; i < 7; i++) b.box(0.78 + i * 0.1, 0.74, 1.65, 0.085, 0.06, 0.18, i % 2 ? TILE.olive : TILE.linen)
      b.cylinder(1.5, 0.74, 1.75, 0.05, 0.14, TILE.water, { segments: 6 })
      chair(b, 1.1, 2.35, Math.PI, TILE.beige)
    },
  },
  vaccination: {
    floor: TILE.tiles, wall: TILE.plasterSand, partition: 0.6,
    furnish(b) {
      // Nevera de vacunas
      b.box(0.55, 0, 0.3, 0.62, 1.2, 0.56, TILE.white, { front: TILE.medicines })
      b.box(0.55, 1.2, 0.3, 0.66, 0.06, 0.6, TILE.darkmetal)
      onWall(b, 1.4, 0.95, 0.5, 0.58, TILE.calendar)
      // Sillón y bandeja con jeringa
      b.box(1.25, 0.12, 1.3, 0.66, 0.3, 0.6, TILE.navy); b.box(1.25, 0.4, 1.03, 0.66, 0.5, 0.14, TILE.navy)
      for (const dx of [-0.36, 0.36]) b.box(1.25 + dx, 0.3, 1.3, 0.1, 0.3, 0.6, TILE.darkwood)
      b.box(1.25, 0, 1.3, 0.5, 0.12, 0.46, TILE.darkmetal)
      b.box(0.55, 0, 1.75, 0.06, 0.66, 0.06, TILE.metal); b.box(0.55, 0.66, 1.75, 0.56, 0.04, 0.4, TILE.metal, { top: TILE.linen })
      b.box(0.5, 0.72, 1.75, 0.26, 0.06, 0.06, TILE.white); b.box(0.68, 0.74, 1.75, 0.12, 0.02, 0.02, TILE.metal); b.box(0.36, 0.71, 1.75, 0.03, 0.08, 0.1, TILE.navy)
    },
  },
  care: {
    floor: TILE.oak, wall: TILE.plasterBlue, partition: 0.85,
    furnish(b) {
      windowOn(b, 2.5)
      // Cama articulada
      b.at(1.05, 0, 1.25, 0, (c) => {
        c.box(0, 0.22, 0, 1.15, 0.14, 2.05, TILE.darkmetal)
        c.box(0, 0.36, 0, 1.08, 0.18, 1.95, TILE.linen, { top: TILE.bedding })
        c.box(0, 0.1, -1.02, 1.2, 0.85, 0.07, TILE.wood); c.box(0, 0.1, 1.03, 1.2, 0.5, 0.07, TILE.wood)
        c.box(0, 0.54, -0.72, 0.8, 0.1, 0.42, TILE.linen)
        for (const sx of [-0.5, 0.5]) for (const sz of [-0.9, 0.9]) c.box(sx, 0, sz, 0.08, 0.22, 0.08, TILE.darkmetal)
        c.box(0.6, 0.55, -0.3, 0.04, 0.22, 0.9, TILE.metal)
      })
      tableLamp(b, 1.95, 0.5, 0.35); b.box(1.95, 0, 0.35, 0.46, 0.5, 0.42, TILE.wood, { front: TILE.drawersWood })
      // Silla de ruedas
      b.at(2.55, 0, 1.75, -0.35, (c) => {
        c.box(0, 0.44, 0, 0.5, 0.08, 0.48, TILE.navy); c.box(0, 0.5, -0.24, 0.5, 0.5, 0.06, TILE.navy)
        for (const sx of [-0.31, 0.31]) {
          c.wheel(sx, 0.32, -0.04, 0.31, 0.05, TILE.darkmetal)
          c.wheel(sx, 0.32, -0.04, 0.24, 0.06, TILE.metal)
          c.wheel(sx, 0.32, -0.04, 0.06, 0.08, TILE.darkmetal)
          c.box(sx, 0.62, 0, 0.06, 0.05, 0.4, TILE.darkmetal)
          c.box(sx * 0.7, 0.04, 0.34, 0.06, 0.12, 0.12, TILE.darkmetal); c.box(sx, 0.95, -0.34, 0.05, 0.05, 0.2, TILE.darkmetal)
        }
        c.box(0, 0.1, 0.42, 0.44, 0.04, 0.16, TILE.metal)
      })
      onWall(b, 1.1, 1.15, 0.6, 0.5, TILE.paintingC)
    },
  },
  emergency: {
    floor: TILE.tiles, wall: TILE.plasterClay, partition: 0.85,
    furnish(b) {
      onWall(b, 0.55, 0.95, 0.62, 0.62, TILE.alarm, 0.1)
      onWall(b, 1.2, 0.95, 0.4, 0.6, TILE.phone, 0.12)
      // Extintor
      b.cylinder(1.75, 0.1, 0.22, 0.12, 0.58, TILE.rust, { tint: '#f0b8a4' }); b.cylinder(1.75, 0.68, 0.22, 0.06, 0.12, TILE.darkmetal); b.box(1.83, 0.72, 0.28, 0.16, 0.04, 0.04, TILE.darkmetal)
      // Maletín de primeros auxilios
      b.box(0.95, 0, 1.35, 1.2, 0.46, 0.6, TILE.wood, { front: TILE.drawersWood })
      b.box(0.8, 0.46, 1.4, 0.56, 0.38, 0.3, TILE.white, { front: TILE.cross }); b.box(0.8, 0.84, 1.4, 0.2, 0.06, 0.06, TILE.darkmetal)
      b.box(1.35, 0.46, 1.35, 0.3, 0.02, 0.22, TILE.paper, { top: TILE.ledger })
    },
  },
  pets: {
    floor: TILE.oak, wall: TILE.plasterSand, partition: 0.6,
    furnish(b) {
      onWall(b, 0.65, 1, 0.46, 0.46, TILE.photoB); onWall(b, 1.25, 0.92, 0.46, 0.46, TILE.photo)
      rug(b, 1.15, 1.75, 1.9, 1.3, TILE.rugOlive)
      // Cama con perro
      b.cylinder(0.8, 0, 1.65, 0.5, 0.16, TILE.greyCloth, { segments: 10, top: TILE.linen })
      b.blob(0.78, 0.28, 1.65, 0.32, 0.16, 0.2, TILE.leather, { tint: '#ffe2c4' })
      b.blob(1.06, 0.4, 1.74, 0.15, 0.13, 0.13, TILE.leather, { tint: '#ffe2c4' }); b.box(1.2, 0.34, 1.78, 0.1, 0.07, 0.09, TILE.leather)
      for (const dz of [-0.08, 0.1]) b.box(1.02, 0.46, 1.74 + dz, 0.07, 0.12, 0.05, TILE.darkwood)
      bowl(b, 1.6, 0.02, 1.95, 0.13, TILE.navy, TILE.leather); bowl(b, 1.95, 0.02, 1.8, 0.13, TILE.white)
      // Rascador y saco de pienso
      b.box(1.8, 0, 0.5, 0.56, 0.05, 0.5, TILE.beige); b.cylinder(1.8, 0.05, 0.5, 0.08, 0.8, TILE.beige); b.box(1.8, 0.85, 0.5, 0.5, 0.06, 0.4, TILE.beige)
      b.box(0.5, 0, 0.4, 0.44, 0.62, 0.3, TILE.olive, { front: TILE.photo }); mug(b, 1.2, 0, 0.35, TILE.rust)
    },
  },
} satisfies Record<string, RoomDesign>
