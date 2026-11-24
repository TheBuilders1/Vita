import { describe, expect, test } from 'vitest'
import { BUILDING, VIEW, WORLD_BOUNDS, floorY } from '@/three/config'
import { frameBox, keepInside, projectedBounds, projectPoint, viewAxes, type Box } from '@/three/camera/framing'
import { zoneOf } from '@/three/rooms/layout'
import { levelBox, zoneBox } from '@/three/rooms/bounds'

const dot = (a: readonly number[], b: readonly number[]) => a.reduce((s, v, i) => s + v * b[i]!, 0)
const corners = (b: Box) => [b.min[0], b.max[0]].flatMap((x) => [b.min[1], b.max[1]].flatMap((y) => [b.min[2], b.max[2]].map((z) => [x, y, z] as const)))

describe('ejes de la cámara', () => {
  test('son perpendiculares y unitarios', () => {
    const { right, up, toCamera } = viewAxes()
    for (const v of [right, up, toCamera]) expect(dot(v, v)).toBeCloseTo(1)
    expect(dot(right, up)).toBeCloseTo(0)
    expect(dot(right, toCamera)).toBeCloseTo(0)
    expect(dot(up, toCamera)).toBeCloseTo(0)
  })
  test('la cámara mira desde delante, por la derecha y desde arriba', () => {
    expect(viewAxes().toCamera.every((v) => v > 0)).toBe(true)
  })
})

describe.each([[1040, 836], [1440, 900], [1024, 700], [768, 600], [390, 420], [320, 300]])('en %i×%i', (width, height) => {
  const fits = (box: Box) => {
    const { center, zoom } = frameBox(box, { width, height })
    for (const corner of corners(box)) {
      const [x, y] = projectPoint(corner)
      expect(Math.abs(x - center[0]) * zoom).toBeLessThanOrEqual(width / 2)
      expect(Math.abs(y - center[1]) * zoom).toBeLessThanOrEqual(height / 2)
    }
  }
  test('el edificio entero cabe', () => fits(WORLD_BOUNDS))
  test('una habitación cabe', () => fits(zoneBox(zoneOf('medication'))))
  test('acercarse a una habitación amplía', () => {
    expect(frameBox(zoneBox(zoneOf('medication')), { width, height }).zoom).toBeGreaterThan(frameBox(WORLD_BOUNDS, { width, height }).zoom * 1.8)
  })
})

test('un lienzo sin tamaño no produce valores infinitos', () => {
  const frame = frameBox(WORLD_BOUNDS, { width: 0, height: 0 })
  expect([frame.zoom, ...frame.center].every(Number.isFinite)).toBe(true)
  expect(frame.zoom).toBeGreaterThan(0)
})

/** Un rayo hacia la cámara desde el interior no debe chocar con el forjado de arriba. */
function visibleUnderSlab(height: number, z: number) {
  const { toCamera } = viewAxes()
  const t = (BUILDING.depth - z) / toCamera[2]
  return height + t * toCamera[1] <= BUILDING.storey - BUILDING.slab
}

describe('visibilidad del interior', () => {
  test('se ve todo el suelo y al menos 1,5 m de la pared del fondo', () => {
    expect(visibleUnderSlab(0, 0)).toBe(true)
    expect(visibleUnderSlab(1.5, 0)).toBe(true)
  })
  test('una nevera de 1,85 m se ve entera por delante', () => {
    expect(visibleUnderSlab(1.85, 0.7)).toBe(true)
  })
  test('un tabique no tapa más de 60 cm de la habitación vecina', () => {
    const { toCamera } = viewAxes()
    expect(BUILDING.partitionDepth * (toCamera[0] / toCamera[2])).toBeLessThanOrEqual(0.6)
  })
  test('la perspectiva sigue siendo axonométrica: se ven suelo y dos caras', () => {
    expect(VIEW.elevationDeg).toBeGreaterThanOrEqual(18)
    expect(VIEW.azimuthDeg).toBeGreaterThanOrEqual(25)
    expect(floorY(1)).toBeGreaterThanOrEqual(WORLD_BOUNDS.min[1])
  })
})

describe('keepInside', () => {
  const size = { width: 936, height: 800 }
  const world = projectedBounds(WORLD_BOUNDS)
  test('al acercarse a la última planta no se enseña vacío por encima', () => {
    const frame = keepInside(frameBox(levelBox(5), size), WORLD_BOUNDS, size)
    expect(frame.center[1] + size.height / 2 / frame.zoom).toBeLessThanOrEqual(world.top + 0.6)
  })
  test('al acercarse a la primera tampoco por debajo', () => {
    const frame = keepInside(frameBox(levelBox(1), size), WORLD_BOUNDS, size)
    expect(frame.center[1] - size.height / 2 / frame.zoom).toBeGreaterThanOrEqual(world.bottom - 0.6)
  })
  test('si el edificio cabe entero se centra', () => {
    const frame = keepInside({ center: [50, 50], zoom: 1 }, WORLD_BOUNDS, size)
    expect(frame.center[0]).toBeCloseTo((world.left + world.right) / 2)
    expect(frame.center[1]).toBeCloseTo((world.top + world.bottom) / 2)
  })
})
