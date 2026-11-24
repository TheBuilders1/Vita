/** Lienzo de píxeles con azar determinista: la misma textura en todos los equipos y en cada carga. */
export class Painter {
  readonly width: number
  readonly height: number
  readonly pixels: Uint8Array
  private seed: number

  constructor(width: number, height: number, seed: number) {
    this.width = width
    this.height = height
    this.pixels = new Uint8Array(width * height * 4).fill(255)
    this.seed = seed
  }

  random(): number {
    this.seed = (this.seed + 0x6d2b79f5) | 0
    let t = Math.imul(this.seed ^ (this.seed >>> 15), 1 | this.seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  pick = <T>(values: readonly T[]): T => values[Math.floor(this.random() * values.length)]!

  /** y = 0 es la fila de arriba. */
  px(x: number, y: number, hex: string): this {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return this
    const i = (Math.floor(y) * this.width + Math.floor(x)) * 4
    const value = Number.parseInt(hex.slice(1), 16)
    this.pixels[i] = value >> 16
    this.pixels[i + 1] = (value >> 8) & 255
    this.pixels[i + 2] = value & 255
    return this
  }

  rect(x: number, y: number, w: number, h: number, hex: string): this {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.px(i, j, hex)
    return this
  }

  fill = (hex: string) => this.rect(0, 0, this.width, this.height, hex)

  frame(x: number, y: number, w: number, h: number, hex: string): this {
    return this.rect(x, y, w, 1, hex).rect(x, y + h - 1, w, 1, hex).rect(x, y, 1, h, hex).rect(x + w - 1, y, 1, h, hex)
  }

  /** Motas sueltas: rompen la superficie lisa sin ensuciarla. */
  speckle(colors: readonly string[], amount: number): this {
    const count = Math.round(this.width * this.height * amount)
    for (let n = 0; n < count; n++) this.px(this.random() * this.width, this.random() * this.height, this.pick(colors))
    return this
  }

  /** Dibujo con caracteres; el punto es transparente. */
  sprite(x: number, y: number, rows: readonly string[], colors: Readonly<Record<string, string>>): this {
    rows.forEach((row, j) => [...row].forEach((key, i) => { const hex = colors[key]; if (hex) this.px(x + i, y + j, hex) }))
    return this
  }
}
