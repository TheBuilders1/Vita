import type { BufferGeometry } from 'three'
import { BUILDING, ROOF_Y, floorY } from '../config'
import { MeshBuilder } from '../geometry/MeshBuilder'
import { TILE, type Tile } from '../materials/tiles'

const { width: W, depth: D, storey: H, slab: S, wall, coreWidth, shaftWidth, floors } = BUILDING
const CLEAR = H - S
const LEVELS = Array.from({ length: floors }, (_, i) => i + 1)
const PLAQUES: readonly Tile[] = [TILE.plaque1, TILE.plaque2, TILE.plaque3, TILE.plaque4, TILE.plaque5]

/** Forjados, muros, núcleo de escalera, cubierta y parcela: lo que no pertenece a ninguna habitación. */
export function buildStructure(): BufferGeometry {
  const b = new MeshBuilder()
  plot(b)
  for (const level of LEVELS) storey(b, level)
  roof(b)
  return b.build()
}

function storey(b: MeshBuilder, level: number) {
  const y = floorY(level)
  // Forjado, con canto claro que remata el corte
  b.box(W / 2, y - S, D / 2, W, S - 0.04, D, TILE.slab, { front: TILE.slabEdge, right: TILE.slabEdge })
  b.box(W / 2, y - S - 0.02, D + 0.03, W + 0.06, S - 0.02, 0.08, TILE.slabEdge)
  b.box(W + 0.03, y - S - 0.02, D / 2, 0.08, S - 0.02, D + 0.1, TILE.slabEdge)
  // Muro medianero izquierdo y pilar trasero derecho
  b.box(-wall / 2, y - S, D / 2 - wall / 2, wall, H, D + wall, TILE.facade, { right: TILE.plaster })
  b.box(W - 0.09, y, 0.14, 0.18, CLEAR, 0.28, TILE.facade)
  // Núcleo
  b.box(coreWidth / 2, y - 0.04, D / 2, coreWidth, 0.04, D, TILE.stone)
  b.box(coreWidth / 2, y, -wall / 2, coreWidth, CLEAR, wall, TILE.plaster)
  b.box(coreWidth, y, 0.42, 0.14, CLEAR, 0.85, TILE.plaster)
  b.box(coreWidth, y, 0.86, 0.18, CLEAR, 0.04, TILE.white)
  stairs(b, y)
  landing(b, y, level)
}

function landing(b: MeshBuilder, y: number, level: number) {
  // Hueco del ascensor: fondo, jambas y barandilla
  b.box(shaftWidth / 2 + 0.1, y, 0.06, 1.6, CLEAR, 0.08, TILE.darkwood, { front: TILE.liftBack })
  for (const x of [0.2, shaftWidth]) b.box(x, y, 0.72, 0.12, CLEAR, 1.3, TILE.darkmetal)
  for (const x of [0.2, shaftWidth]) b.box(x, y, 1.4, 0.16, CLEAR, 0.08, TILE.brass)
  b.box(shaftWidth / 2 + 0.1, y + 2.25, 1.4, 1.7, 0.35, 0.1, TILE.darkmetal)
  b.box(shaftWidth / 2 + 0.1, y + 2.28, 1.46, 0.3, 0.3, 0.02, TILE.darkmetal, { front: PLAQUES[level - 1]!, glow: 0.25 })
  // Número de planta en el canto
  b.box(0.6, y + 0.02, D - 0.06, 0.78, 0.78, 0.08, TILE.darkwood, { front: PLAQUES[level - 1]! })
}

function stairs(b: MeshBuilder, y: number) {
  const steps = 9
  for (let i = 0; i < steps; i++) {
    const h = (i + 1) * (H / 14)
    b.box(coreWidth - 0.3 - i * 0.2, y, 0.5, 0.2, h, 0.85, TILE.wood, { front: TILE.white, right: TILE.oak, left: TILE.white })
  }
  for (let i = 0; i < steps; i += 2) b.box(coreWidth - 0.3 - i * 0.2, y + (i + 1) * (H / 14), 0.9, 0.04, 0.7, 0.04, TILE.darkmetal)
}

function roof(b: MeshBuilder) {
  const y = ROOF_Y
  b.box(W / 2, y - S, D / 2, W, S, D, TILE.gravel, { front: TILE.slabEdge, right: TILE.slabEdge })
  b.box(W / 2, y - S - 0.02, D + 0.03, W + 0.06, S + 0.02, 0.08, TILE.slabEdge)
  b.box(W + 0.03, y - S - 0.02, D / 2, 0.08, S + 0.02, D + 0.1, TILE.slabEdge)
  // Pretil
  b.box(W / 2, y, -0.1, W + 0.2, 0.45, 0.2, TILE.facade, { top: TILE.slabEdge })
  b.box(-0.1, y, D / 2, 0.2, 0.45, D, TILE.facade, { top: TILE.slabEdge })
  b.box(W / 2, y, D - 0.08, W, 0.24, 0.12, TILE.facade, { top: TILE.slabEdge })
  b.box(W - 0.06, y, D / 2, 0.12, 0.24, D, TILE.facade, { top: TILE.slabEdge })
  // Casetón del ascensor
  b.box(shaftWidth / 2 + 0.1, y, 0.8, 2, 1, 1.5, TILE.facade)
  b.gable(shaftWidth / 2 + 0.1, y + 1, 0.8, 2.3, 0.5, 1.9, TILE.roof, TILE.facade)
  // Huerto y vida de azotea
  for (const x of [6.4, 8.6, 10.8]) {
    b.box(x, y, 1.4, 1.7, 0.34, 0.7, TILE.wood, { top: TILE.soil })
    for (let i = 0; i < 4; i++) b.blob(x - 0.6 + i * 0.4, y + 0.44, 1.4 + (i % 2) * 0.14, 0.18, 0.18 + (i % 2) * 0.06, 0.18, i % 2 ? TILE.leaves : TILE.leavesDry)
  }
  b.box(14, y, 1.2, 1.5, 0.4, 0.5, TILE.wood); b.box(14, y + 0.4, 1, 1.5, 0.4, 0.1, TILE.wood)
  for (let i = 0; i < 2; i++) {
    b.box(16.4 + i * 1.5, y + 0.1, 1.4, 1.35, 0.06, 0.9, TILE.darkmetal, { top: TILE.navy })
    b.box(16.4 + i * 1.5, y, 1.1, 1.2, 0.12, 0.06, TILE.metal)
  }
  b.cylinder(20, y, 1.1, 0.5, 0.9, TILE.metal, { segments: 10 })
  b.cylinder(20, y + 0.9, 1.1, 0.54, 0.14, TILE.darkmetal, { segments: 10, topRadius: 0.1 })
  b.box(4.3, y, 0.6, 0.6, 1, 0.6, TILE.facade, { top: TILE.darkmetal }); b.box(4.3, y + 1, 0.6, 0.72, 0.1, 0.72, TILE.slabEdge)
}

function plot(b: MeshBuilder) {
  const y = -S
  b.box(W / 2, y - 0.5, 1.75, W + 2.2, 0.5, D + 2.1, TILE.stone, { top: TILE.pavement })
  b.box(W / 2 + 1.2, y, 3.62, W - 2.6, 0.08, 0.95, TILE.slabEdge, { top: TILE.grass })
  for (let x = 4; x < W; x += 1.6) b.blob(x, y + 0.2, 3.85, 0.62, 0.26, 0.24, TILE.hedge, { tint: x % 3 > 1.4 ? '#e6ead2' : '#ffffff' })
  // Entrada con escalón frente al ascensor
  b.box(1.1, y, 3.4, 2, 0.14, 0.7, TILE.slabEdge)
  b.box(1.1, y, 3.75, 2.3, 0.07, 0.7, TILE.slabEdge)
  for (const [x, z, s] of [[-0.72, 1.5, 0.8], [W + 0.6, 0.4, 1.1]] as const) {
    b.cylinder(x, y, z, 0.1 * s, 0.9 * s, TILE.darkwood, { segments: 6 })
    b.blob(x, y + 1.25 * s, z, 0.55 * s, 0.5 * s, 0.5 * s, TILE.leaves)
    b.blob(x + 0.1 * s, y + 1.65 * s, z - 0.05, 0.36 * s, 0.34 * s, 0.34 * s, TILE.leaves, { tint: '#e8ecd0' })
  }
  // Farola y buzón
  b.box(-0.6, y, 3.9, 0.07, 2, 0.07, TILE.darkmetal); b.box(-0.6, y + 2, 3.9, 0.26, 0.3, 0.26, TILE.lamp, { glow: 0.6, top: TILE.darkmetal })
  b.box(0, y, 4, 0.06, 0.8, 0.06, TILE.darkmetal); b.box(0, y + 0.8, 4, 0.36, 0.26, 0.22, TILE.rust)
}

/** Cabina del ascensor, con origen en el suelo de su planta. */
export function buildLiftCab(): BufferGeometry {
  return new MeshBuilder()
    .box(shaftWidth / 2 + 0.1, 0, 0.75, 1.5, 0.06, 1.2, TILE.darkmetal, { top: TILE.parquet })
    .box(shaftWidth / 2 + 0.1, 0.06, 0.2, 1.5, 2.1, 0.06, TILE.brass, { front: TILE.liftCab, glow: 0.35 })
    .box(shaftWidth / 2 + 0.1, 2.16, 0.75, 1.5, 0.1, 1.2, TILE.darkmetal)
    .box(shaftWidth / 2 + 0.1, 2.13, 0.75, 0.8, 0.04, 0.6, TILE.lamp, { glow: 1 })
    .box(0.42, 0.06, 0.75, 0.06, 2.1, 1.1, TILE.darkwood)
    .build()
}
