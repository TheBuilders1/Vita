import { describe, expect, test } from 'vitest'
import { MeshBuilder } from '@/three/geometry/MeshBuilder'
import { paintTiles, TILE, TILE_COUNT, TILE_SIZE, TEXELS_PER_METER } from '@/three/materials/tiles'

const read = (b: MeshBuilder) => {
  const g = b.build()
  return { g, pos: g.getAttribute('position'), normal: g.getAttribute('normal'), uv: g.getAttribute('aUv'), layer: g.getAttribute('aLayer') }
}

describe('MeshBuilder', () => {
  test('una caja se apoya en su base y se centra en planta', () => {
    const { g } = read(new MeshBuilder().box(1, 2, 3, 2, 4, 6, TILE.plaster))
    g.computeBoundingBox()
    expect(g.boundingBox!.min.toArray()).toEqual([0, 2, 0])
    expect(g.boundingBox!.max.toArray()).toEqual([2, 6, 6])
  })

  test('todas las caras miran hacia fuera', () => {
    const b = new MeshBuilder().box(0, 0, 0, 1, 1, 1, TILE.plaster).cylinder(5, 0, 0, 0.5, 1, TILE.metal).blob(9, 1, 0, 0.5, 0.5, 0.5, TILE.leaves).wheel(14, 1, 0, 0.5, 0.2, TILE.metal)
    const { g, pos, normal } = read(b)
    const centers: [number, number, number][] = [[0, 0.5, 0], [5, 0.5, 0], [9, 1, 0], [14, 1, 0]]
    const index = g.getIndex()!
    for (let i = 0; i < index.count; i += 3) {
      const [a, c, d] = [0, 1, 2].map((k) => index.getX(i + k)) as [number, number, number]
      const p = [a, c, d].map((v) => [pos.getX(v), pos.getY(v), pos.getZ(v)] as const) as unknown as [number[], number[], number[]]
      const mid = [0, 1, 2].map((k) => (p[0][k]! + p[1][k]! + p[2][k]!) / 3)
      const center = centers.toSorted((m, n) => Math.abs(m[0] - mid[0]!) - Math.abs(n[0] - mid[0]!))[0]!
      const outward = mid.map((v, k) => v - center[k]!)
      const e1 = p[1].map((v, k) => v - p[0][k]!), e2 = p[2].map((v, k) => v - p[0][k]!)
      const face = [e1[1]! * e2[2]! - e1[2]! * e2[1]!, e1[2]! * e2[0]! - e1[0]! * e2[2]!, e1[0]! * e2[1]! - e1[1]! * e2[0]!]
      expect(face.reduce((s, v, k) => s + v * outward[k]!, 0)).toBeGreaterThan(0)
      expect(normal.getX(a) * face[0]! + normal.getY(a) * face[1]! + normal.getZ(a) * face[2]!).toBeGreaterThan(0)
    }
  })

  test('las texturas repetidas mantienen la densidad de píxel', () => {
    const { uv } = read(new MeshBuilder().box(0, 0, 0, 2, 1, 1, TILE.plaster))
    const us = Array.from({ length: 4 }, (_, i) => uv.getX(i))
    expect((Math.max(...us) - Math.min(...us)) * TILE_SIZE).toBeCloseTo(2 * TEXELS_PER_METER)
  })

  test('las texturas de una pieza ocupan justo su dibujo', () => {
    const { uv } = read(new MeshBuilder().box(0, 0, 0, 0.9, 1.9, 0.7, TILE.plaster, { front: TILE.fridgeDoor }))
    const us = Array.from({ length: 4 }, (_, i) => uv.getX(i)), vs = Array.from({ length: 4 }, (_, i) => uv.getY(i))
    expect(Math.max(...us)).toBeCloseTo(TILE.fridgeDoor.width / TILE_SIZE)
    expect(Math.max(...vs)).toBeCloseTo(TILE.fridgeDoor.height / TILE_SIZE)
    expect(Math.min(...us, ...vs)).toBe(0)
  })

  test('mover y girar afecta solo a lo que va dentro', () => {
    const { g } = read(new MeshBuilder().at(10, 0, 0, Math.PI / 2, (b) => b.box(0, 0, 0, 4, 1, 1, TILE.plaster)))
    g.computeBoundingBox()
    expect(g.boundingBox!.min.x).toBeCloseTo(9.5)
    expect(g.boundingBox!.max.z).toBeCloseTo(2)
  })
})

describe('texturas', () => {
  const pixels = paintTiles()
  test('son deterministas y opacas', () => {
    expect(pixels).toEqual(paintTiles())
    expect(pixels).toHaveLength(TILE_COUNT * TILE_SIZE * TILE_SIZE * 4)
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i] !== 255) throw new Error(`píxel transparente en ${i}`)
  })
  test('cada textura usa una capa distinta', () => {
    const layers = Object.values(TILE).map((t) => t.layer)
    expect(new Set(layers).size).toBe(layers.length)
    expect(Math.max(...layers)).toBe(TILE_COUNT - 1)
  })
  test('la paleta es sobria: nada de neones', () => {
    for (const [name, tile] of Object.entries(TILE)) {
      const start = tile.layer * TILE_SIZE * TILE_SIZE * 4
      for (let i = start; i < start + TILE_SIZE * TILE_SIZE * 4; i += 4) {
        const [r, g, b] = [pixels[i]!, pixels[i + 1]!, pixels[i + 2]!]
        const max = Math.max(r, g, b), min = Math.min(r, g, b)
        const saturation = max === 0 ? 0 : (max - min) / max
        if (saturation > 0.72 && max > 190) throw new Error(`${name} tiene un color estridente: ${r},${g},${b}`)
      }
    }
  })
})
