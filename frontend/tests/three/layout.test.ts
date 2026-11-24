import { describe, expect, test } from 'vitest'
import { FLOORS } from '@/modules/floors'
import { MODULES, modulesOnFloor } from '@/modules/registry'
import { BUILDING, floorY } from '@/three/config'
import { buildLiftCab, buildStructure } from '@/three/building/buildStructure'
import { buildZone } from '@/three/rooms/buildZone'
import { ZONES, zoneOf, zonesOnLevel } from '@/three/rooms/layout'

describe('reparto de habitaciones', () => {
  test('cada módulo de planta tiene exactamente una zona, en su planta', () => {
    expect(ZONES.map((z) => z.moduleId).toSorted()).toEqual(MODULES.filter((m) => m.floor).map((m) => m.id).toSorted())
    for (const floor of FLOORS) {
      expect(zonesOnLevel(floor.level).map((z) => z.moduleId).toSorted()).toEqual(modulesOnFloor(floor.id).map((m) => m.id).toSorted())
    }
  })

  test.each(FLOORS.map((f) => f.level))('la planta %i se reparte entera, sin huecos ni solapes', (level) => {
    const zones = zonesOnLevel(level)
    expect(zones[0]!.x0).toBe(BUILDING.coreWidth)
    expect(zones.at(-1)!.x1).toBe(BUILDING.width)
    for (let i = 1; i < zones.length; i++) expect(zones[i]!.x0).toBeCloseTo(zones[i - 1]!.x1)
  })

  test('ninguna zona es demasiado estrecha para pulsarla', () => {
    for (const z of ZONES) expect(z.x1 - z.x0, z.moduleId).toBeGreaterThanOrEqual(1.6)
  })

  test('las plantas se apilan con altura constante', () => {
    expect(floorY(1)).toBe(0)
    expect(floorY(5) - floorY(4)).toBeCloseTo(BUILDING.storey)
  })

  test('un módulo sin planta no tiene zona', () => {
    expect(() => zoneOf('planner')).toThrow('no tiene habitación')
  })
})

describe('presupuesto de dibujo', () => {
  test('el edificio entero no pasa de 60.000 triángulos', () => {
    const triangles = [buildStructure(), buildLiftCab(), ...ZONES.map(buildZone)].reduce((sum, g) => sum + g.getIndex()!.count / 3, 0)
    expect(triangles).toBeGreaterThan(5_000)
    expect(triangles).toBeLessThan(60_000)
  })
  test.each(ZONES.map((z) => [z.moduleId, z] as const))('los muebles de %s no se salen de su planta', (_id, zone) => {
    const g = buildZone(zone)
    g.computeBoundingBox()
    const { min, max } = g.boundingBox!
    const w = zone.x1 - zone.x0
    expect(min.x).toBeGreaterThanOrEqual(-0.3)
    expect(max.x).toBeLessThanOrEqual(w + 0.3)
    expect(max.y).toBeLessThanOrEqual(BUILDING.storey - BUILDING.slab + 0.001)
    expect(max.z).toBeLessThanOrEqual(BUILDING.depth + 0.001)
  })
})
