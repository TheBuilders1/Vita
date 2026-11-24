import { VIEW } from '../config'

export type Vec3 = readonly [number, number, number]
export interface Box { readonly min: Vec3; readonly max: Vec3 }
export interface Size { readonly width: number; readonly height: number }
/** Centro en el plano de la pantalla (metros) y píxeles por metro. */
export interface Frame { readonly center: readonly [number, number]; readonly zoom: number }

const MARGIN = 0.95
const MAX_ZOOM = 190

export function viewAxes() {
  const azimuth = (VIEW.azimuthDeg * Math.PI) / 180
  const elevation = (VIEW.elevationDeg * Math.PI) / 180
  const [sa, ca, se, ce] = [Math.sin(azimuth), Math.cos(azimuth), Math.sin(elevation), Math.cos(elevation)]
  return {
    toCamera: [sa * ce, se, ca * ce] as Vec3,
    right: [ca, 0, -sa] as Vec3,
    up: [-sa * se, ce, -ca * se] as Vec3,
  }
}

const AXES = viewAxes()
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

export const projectPoint = (point: Vec3): [number, number] => [dot(point, AXES.right), dot(point, AXES.up)]

export function projectedBounds({ min, max }: Box) {
  const points = [min[0], max[0]].flatMap((x) => [min[1], max[1]].flatMap((y) => [min[2], max[2]].map((z) => projectPoint([x, y, z]))))
  const xs = points.map((p) => p[0])
  const ys = points.map((p) => p[1])
  return { left: Math.min(...xs), right: Math.max(...xs), bottom: Math.min(...ys), top: Math.max(...ys) }
}

export function frameBox(box: Box, { width, height }: Size): Frame {
  const { left, right, bottom, top } = projectedBounds(box)
  const scale = Math.min(width / (right - left), height / (top - bottom)) * MARGIN
  return { center: [(left + right) / 2, (bottom + top) / 2], zoom: Math.min(MAX_ZOOM, Math.max(1, scale)) }
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** Margen de aire permitido alrededor del edificio, en metros. */
const AIR = 0.5

function fit(value: number, min: number, max: number, view: number): number {
  const low = min - AIR + view / 2
  const high = max + AIR - view / 2
  return low >= high ? (min + max) / 2 : clamp(value, low, high)
}

/** Desplaza el encuadre para no enseñar vacío fuera del edificio; en el eje en que cabe entero, lo centra. */
export function keepInside({ center, zoom }: Frame, world: Box, { width, height }: Size): Frame {
  const { left, right, bottom, top } = projectedBounds(world)
  return { center: [fit(center[0], left, right, width / zoom), fit(center[1], bottom, top, height / zoom)], zoom }
}
