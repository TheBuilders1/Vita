import { BufferGeometry, Color, Float32BufferAttribute, Matrix4, Vector3 } from 'three'
import { TEXELS_PER_METER, TILE_SIZE, type Tile } from '../materials/tiles'

export interface FaceOptions {
  readonly front?: Tile
  readonly back?: Tile
  readonly left?: Tile
  readonly right?: Tile
  readonly top?: Tile
  readonly bottom?: Tile
  readonly tint?: string
  /** 0 = iluminado por la escena; 1 = brilla por sí mismo (lámparas, pantallas). */
  readonly glow?: number
}

interface Surface { readonly tile: Tile; readonly tint?: string | undefined; readonly glow?: number | undefined }
type P3 = readonly [number, number, number]

const UV_PER_METER = TEXELS_PER_METER / TILE_SIZE
const WHITE = '#ffffff'
const X: P3 = [1, 0, 0]
const NX: P3 = [-1, 0, 0]
const Y: P3 = [0, 1, 0]
const Z: P3 = [0, 0, 1]
const NZ: P3 = [0, 0, -1]

/**
 * Carpintería: acumula piezas sencillas en una sola malla. Una habitación entera
 * acaba siendo una única llamada de dibujo.
 */
export class MeshBuilder {
  private readonly positions: number[] = []
  private readonly normals: number[] = []
  private readonly uvs: number[] = []
  private readonly layers: number[] = []
  private readonly colors: number[] = []
  private readonly glows: number[] = []
  private readonly indices: number[] = []
  private matrix = new Matrix4()

  /** Todo lo que se construya dentro queda desplazado y girado. */
  at(x: number, y: number, z: number, rotationY: number, work: (b: MeshBuilder) => void): this {
    const previous = this.matrix
    this.matrix = previous.clone().multiply(new Matrix4().makeRotationY(rotationY).setPosition(x, y, z))
    work(this)
    this.matrix = previous
    return this
  }

  /** Caja centrada en (x, z) y apoyada en y. */
  box(x: number, y: number, z: number, w: number, h: number, d: number, tile: Tile, o: FaceOptions = {}): this {
    const [x0, x1, y0, y1, z0, z1] = [x - w / 2, x + w / 2, y, y + h, z - d / 2, z + d / 2]
    const face = (t: Tile | undefined, n: P3, a: P3, b: P3, c: P3, e: P3, u: P3, v: P3) =>
      this.quad([a, b, c, e], n, { tile: t ?? tile, tint: o.tint, glow: o.glow }, u, v)
    face(o.front, Z, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], X, Y)
    face(o.right, X, [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], NZ, Y)
    face(o.top, Y, [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], X, NZ)
    face(o.left, NX, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], Z, Y)
    face(o.back, NZ, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], NX, Y)
    face(o.bottom, [0, -1, 0], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], X, Z)
    return this
  }

  cylinder(x: number, y: number, z: number, radius: number, h: number, tile: Tile, o: FaceOptions & { segments?: number; topRadius?: number } = {}): this {
    const segments = o.segments ?? 8
    const top = o.topRadius ?? radius
    const ring = (r: number, yy: number, i: number): P3 => {
      const a = (i / segments) * Math.PI * 2
      return [x + Math.cos(a) * r, yy, z + Math.sin(a) * r]
    }
    const side = { tile, tint: o.tint, glow: o.glow }
    const cap = { ...side, tile: o.top ?? tile }
    for (let i = 0; i < segments; i++) {
      const [a, b, c, d] = [ring(radius, y, i + 1), ring(radius, y, i), ring(top, y + h, i), ring(top, y + h, i + 1)]
      this.polygon([a, b, c, d], side)
      if (top > 0) this.polygon([[x, y + h, z], d, c], cap)
      this.polygon([[x, y, z], b, a], side)
    }
    return this
  }

  /** Disco vertical con el eje en x, centrado en el punto. */
  wheel(x: number, y: number, z: number, radius: number, thickness: number, tile: Tile): this {
    const segments = 12
    const rim = (xx: number, i: number): P3 => {
      const a = (i / segments) * Math.PI * 2
      return [xx, y + Math.sin(a) * radius, z + Math.cos(a) * radius]
    }
    const [x0, x1] = [x - thickness / 2, x + thickness / 2]
    for (let i = 0; i < segments; i++) {
      this.polygon([rim(x0, i), rim(x1, i), rim(x1, i + 1), rim(x0, i + 1)], { tile })
      this.polygon([[x1, y, z], rim(x1, i + 1), rim(x1, i)], { tile })
      this.polygon([[x0, y, z], rim(x0, i), rim(x0, i + 1)], { tile })
    }
    return this
  }

  /** Masa facetada: copas de árbol, cojines, hojas. */
  blob(x: number, y: number, z: number, rx: number, ry: number, rz: number, tile: Tile, o: Pick<FaceOptions, 'tint' | 'glow'> = {}): this {
    const rings = 4
    const segments = 7
    const point = (r: number, s: number): P3 => {
      const phi = (r / rings) * Math.PI
      const theta = (s / segments) * Math.PI * 2 + r * 0.45
      return [x + Math.sin(phi) * Math.cos(theta) * rx, y + Math.cos(phi) * ry, z + Math.sin(phi) * Math.sin(theta) * rz]
    }
    const surface = { tile, tint: o.tint, glow: o.glow }
    for (let r = 0; r < rings; r++) for (let s = 0; s < segments; s++) {
      const [a, b, c, d] = [point(r, s), point(r, s + 1), point(r + 1, s + 1), point(r + 1, s)]
      if (r > 0) this.polygon([a, b, d], surface)
      if (r < rings - 1) this.polygon([b, c, d], surface)
    }
    return this
  }

  /** Prisma triangular tumbado a lo largo de x: cubiertas y cuñas. */
  gable(x: number, y: number, z: number, w: number, h: number, d: number, roof: Tile, ends: Tile): this {
    const [x0, x1, z0, z1] = [x - w / 2, x + w / 2, z - d / 2, z + d / 2]
    this.polygon([[x0, y, z1], [x1, y, z1], [x1, y + h, z], [x0, y + h, z]], { tile: roof })
    this.polygon([[x1, y, z0], [x0, y, z0], [x0, y + h, z], [x1, y + h, z]], { tile: roof })
    this.polygon([[x1, y, z1], [x1, y, z0], [x1, y + h, z]], { tile: ends })
    this.polygon([[x0, y, z0], [x0, y, z1], [x0, y + h, z]], { tile: ends })
    return this
  }

  build(): BufferGeometry {
    const g = new BufferGeometry()
    const set = (name: string, values: number[], size: number) => g.setAttribute(name, new Float32BufferAttribute(values, size))
    set('position', this.positions, 3)
    set('normal', this.normals, 3)
    set('color', this.colors, 3)
    set('aUv', this.uvs, 2)
    set('aLayer', this.layers, 1)
    set('aGlow', this.glows, 1)
    g.setIndex(this.indices)
    g.computeBoundingSphere()
    return g
  }

  private quad(points: [P3, P3, P3, P3], normal: P3, surface: Surface, u: P3, v: P3) {
    const { tile } = surface
    const along = (p: P3, axis: P3) => p[0] * axis[0] + p[1] * axis[1] + p[2] * axis[2]
    const uv: [number, number][] = tile.fit
      ? [[0, 0], [1, 0], [1, 1], [0, 1]].map(([s, t]) => [(s! * tile.width) / TILE_SIZE, (t! * tile.height) / TILE_SIZE])
      : points.map((p) => [along(p, u) * UV_PER_METER, along(p, v) * UV_PER_METER])
    this.push(points, normal, surface, uv)
  }

  /** Cara plana cualquiera (triángulo o cuadrilátero), vista en sentido antihorario. */
  private polygon(points: readonly P3[], surface: Surface) {
    const [a, b, c] = points.map((p) => new Vector3(...p)) as [Vector3, Vector3, Vector3]
    const e1 = b.clone().sub(a)
    const n = e1.clone().cross(c.clone().sub(a)).normalize()
    const u = e1.normalize()
    const v = n.clone().cross(u)
    const uv = points.map((p): [number, number] => {
      const r = new Vector3(...p).sub(a)
      return [r.dot(u) * UV_PER_METER, r.dot(v) * UV_PER_METER]
    })
    this.push(points, n.toArray(), surface, uv)
  }

  private push(points: readonly P3[], normal: P3, { tile, tint = WHITE, glow = 0 }: Surface, uv: readonly [number, number][]) {
    const base = this.positions.length / 3
    const n = new Vector3(...normal).transformDirection(this.matrix)
    const color = new Color(tint)
    points.forEach((p, i) => {
      this.positions.push(...new Vector3(...p).applyMatrix4(this.matrix).toArray())
      this.normals.push(n.x, n.y, n.z)
      this.uvs.push(...uv[i]!)
      this.layers.push(tile.layer)
      this.colors.push(color.r, color.g, color.b)
      this.glows.push(glow)
    })
    for (let i = 1; i < points.length - 1; i++) this.indices.push(base, base + i, base + i + 1)
  }
}
