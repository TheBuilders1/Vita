import type { MeshBuilder } from '../geometry/MeshBuilder'
import { TILE, type Tile } from '../materials/tiles'

/** Piezas compartidas. Coordenadas locales de la habitación: z = 0 es la pared del fondo, z = 3 el frente. */
type B = MeshBuilder

export function table(b: B, x: number, z: number, w: number, d: number, tile: Tile = TILE.wood, h = 0.74) {
  b.box(x, h - 0.07, z, w, 0.07, d, tile)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(x + sx * (w / 2 - 0.07), 0, z + sz * (d / 2 - 0.07), 0.08, h - 0.07, 0.08, tile)
}

/** Con rotación 0 el respaldo queda al fondo y se sienta mirando al frente. */
export function chair(b: B, x: number, z: number, rotation = 0, seat: Tile = TILE.beige, frame: Tile = TILE.darkwood) {
  b.at(x, 0, z, rotation, (c) => {
    for (const sx of [-0.18, 0.18]) for (const sz of [-0.18, 0.18]) c.box(sx, 0, sz, 0.06, 0.42, 0.06, frame)
    c.box(0, 0.42, 0, 0.44, 0.07, 0.44, seat)
    for (const sx of [-0.18, 0.18]) c.box(sx, 0.49, -0.19, 0.06, 0.42, 0.06, frame)
    c.box(0, 0.68, -0.19, 0.44, 0.2, 0.05, frame)
  })
}

export function stool(b: B, x: number, z: number, seat: Tile = TILE.wood, h = 0.5) {
  for (const sx of [-0.12, 0.12]) for (const sz of [-0.12, 0.12]) b.box(x + sx, 0, z + sz, 0.05, h - 0.06, 0.05, TILE.darkwood)
  b.cylinder(x, h - 0.06, z, 0.2, 0.07, seat)
}

export function pendant(b: B, x: number, z: number, y = 1.95, tile: Tile = TILE.olive) {
  b.box(x, y + 0.24, z, 0.03, 3.1 - y - 0.24, 0.03, TILE.darkmetal)
  b.cylinder(x, y + 0.04, z, 0.28, 0.22, tile, { topRadius: 0.1, segments: 8 })
  b.cylinder(x, y, z, 0.12, 0.06, TILE.lamp, { glow: 0.9 })
}

export function floorLamp(b: B, x: number, z: number, h = 1.45) {
  b.cylinder(x, 0, z, 0.16, 0.05, TILE.darkmetal)
  b.box(x, 0.05, z, 0.04, h, 0.04, TILE.darkmetal)
  b.cylinder(x, h, z, 0.22, 0.28, TILE.lamp, { topRadius: 0.14, glow: 0.65 })
}

export function tableLamp(b: B, x: number, y: number, z: number, shade: Tile = TILE.lamp) {
  b.cylinder(x, y, z, 0.07, 0.03, TILE.brass)
  b.box(x, y + 0.03, z, 0.03, 0.18, 0.03, TILE.brass)
  b.cylinder(x, y + 0.2, z, 0.13, 0.15, shade, { topRadius: 0.08, glow: 0.6 })
}

export function plant(b: B, x: number, z: number, size = 1, y = 0) {
  const s = size
  b.cylinder(x, y, z, 0.13 * s, 0.26 * s, TILE.terracotta, { topRadius: 0.18 * s, top: TILE.soil })
  b.blob(x, y + 0.52 * s, z, 0.26 * s, 0.26 * s, 0.26 * s, TILE.leaves)
  b.blob(x + 0.13 * s, y + 0.72 * s, z - 0.04 * s, 0.17 * s, 0.18 * s, 0.17 * s, TILE.leaves, { tint: '#e8ecd0' })
  b.blob(x - 0.14 * s, y + 0.64 * s, z + 0.08 * s, 0.16 * s, 0.17 * s, 0.16 * s, TILE.leaves, { tint: '#cfd6b4' })
}

/** Estantería pegada al fondo, con un dibujo de lomos por balda. */
export function bookcase(b: B, x: number, w: number, h: number, shelves: readonly Tile[], tile: Tile = TILE.darkwood, depth = 0.34, z0 = 0) {
  const z = z0 + depth / 2
  b.box(x, 0, z0 + 0.03, w, h, 0.05, tile)
  for (const sx of [-1, 1]) b.box(x + sx * (w / 2 - 0.025), 0, z, 0.05, h, depth, tile)
  const step = (h - 0.08) / shelves.length
  shelves.forEach((books, i) => {
    const y = 0.06 + i * step
    b.box(x, y - 0.03, z, w, 0.045, depth, tile)
    b.box(x, y + 0.015, z - 0.04, w - 0.12, step * 0.78, depth - 0.12, TILE.darkwood, { front: books })
  })
  b.box(x, h - 0.05, z, w + 0.04, 0.05, depth + 0.02, tile)
}

/** Mueble bajo con frentes; cada frente es un dibujo completo. */
export function counter(b: B, x: number, w: number, fronts: readonly Tile[], top: Tile, { h = 0.88, depth = 0.6, z0 = 0, side = TILE.white as Tile } = {}) {
  const unit = w / fronts.length
  const z = z0 + depth / 2
  b.box(x, 0, z - 0.03, w, 0.08, depth - 0.08, TILE.darkwood)
  fronts.forEach((front, i) => b.box(x - w / 2 + unit * (i + 0.5), 0.08, z, unit - 0.01, h - 0.13, depth, side, { front }))
  b.box(x, h - 0.05, z + 0.02, w + 0.04, 0.05, depth + 0.06, top)
}

export function onWall(b: B, x: number, y: number, w: number, h: number, tile: Tile, thickness = 0.05) {
  b.box(x, y, thickness / 2, w, h, thickness, TILE.darkwood, { front: tile })
}

export function windowOn(b: B, x: number, y = 0.86, scale = 1) {
  const [w, h] = [1.2 * scale, 0.9 * scale]
  b.box(x, y, 0.03, w, h, 0.06, TILE.white, { front: TILE.window, glow: 0.12 })
  b.box(x, y - 0.06, 0.09, w + 0.12, 0.06, 0.18, TILE.white)
}

export function rug(b: B, x: number, z: number, w: number, d: number, tile: Tile) {
  b.box(x, 0, z, w, 0.025, d, TILE.linen, { top: tile })
}

export function bookStack(b: B, x: number, y: number, z: number, tiles: readonly Tile[] = [TILE.navy, TILE.rust, TILE.olive]) {
  tiles.forEach((t, i) => b.box(x + (i % 2) * 0.03, y + i * 0.055, z, 0.26 - i * 0.02, 0.05, 0.19, t, { front: TILE.paper, right: TILE.paper }))
}

export function mug(b: B, x: number, y: number, z: number, tile: Tile = TILE.white) {
  b.cylinder(x, y, z, 0.05, 0.1, tile, { segments: 6 })
}

export function monitor(b: B, x: number, y: number, z: number, screen: Tile, w = 0.62) {
  const h = (w * screen.height) / screen.width
  b.box(x, y, z, w * 0.4, 0.03, 0.18, TILE.darkmetal)
  b.box(x, y + 0.03, z - 0.03, 0.06, 0.12, 0.05, TILE.darkmetal)
  b.box(x, y + 0.12, z, w, h, 0.06, TILE.darkmetal)
  b.box(x, y + 0.12, z + 0.032, w, h, 0.01, TILE.darkmetal, { front: screen, glow: 0.5 })
}

export function pot(b: B, x: number, y: number, z: number, r = 0.14, tile: Tile = TILE.darkmetal) {
  b.cylinder(x, y, z, r, r * 1.1, tile, { segments: 8 })
  b.box(x, y + r * 0.8, z, r * 2.7, 0.03, 0.05, tile)
}

export function bowl(b: B, x: number, y: number, z: number, r = 0.14, tile: Tile = TILE.white, fruit?: Tile) {
  b.cylinder(x, y, z, r * 0.6, r * 0.6, tile, { topRadius: r })
  if (fruit) for (const [dx, dz, t] of [[-0.05, 0, '#ffffff'], [0.05, 0.03, '#f0d8b0'], [0, -0.05, '#d8e0b0']] as const) b.blob(x + dx, y + r * 0.7, z + dz, 0.06, 0.06, 0.06, fruit, { tint: t })
}

export function crate(b: B, x: number, y: number, z: number, w = 0.42, h = 0.28, d = 0.32, tile: Tile = TILE.wood) {
  b.box(x, y, z, w, h, d, tile, { top: TILE.soil })
  b.box(x, y + h - 0.05, z, w + 0.02, 0.03, d + 0.02, TILE.darkwood, { top: tile })
}
