import type { Box } from './camera/framing'

/** Medidas en metros. Origen: esquina trasera izquierda, a ras del suelo de la planta 1. */
export const BUILDING = {
  width: 21,
  depth: 3,
  storey: 3.3,
  slab: 0.2,
  wall: 0.2,
  /** Núcleo de comunicaciones: ascensor y escalera. */
  coreWidth: 4,
  shaftWidth: 1.9,
  partitionDepth: 0.85,
  floors: 5,
} as const

/**
 * Axonometría fija. Con la isométrica pura el forjado taparía la pared del fondo:
 * tests/three/framing.test.ts comprueba lo que se ve con estos ángulos.
 */
export const VIEW = { azimuthDeg: 35, elevationDeg: 21 } as const

export const floorY = (level: number) => (level - 1) * BUILDING.storey
export const ROOF_Y = BUILDING.floors * BUILDING.storey

export const WORLD_BOUNDS: Box = { min: [-1.1, -0.7, -0.8], max: [22.1, ROOF_Y + 1.2, 4.3] }
