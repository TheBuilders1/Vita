/** Paisaje pixel art del fondo. Los tonos los vigila tests/styles/contrast.test.ts. */
export interface Tones {
  readonly skyTop: string; readonly skyMid: string; readonly skyLow: string; readonly sun: string; readonly cloud: string
  readonly far: string; readonly mid: string; readonly near: string; readonly wall: string; readonly roof: string
  readonly field: string; readonly fieldShade: string; readonly tree: string
}
export const LANDSCAPE: Record<'full' | 'soft', Tones> = {
  full: { skyTop: '#c9d6d6', skyMid: '#dbe0d6', skyLow: '#ece2cb', sun: '#f5e6bd', cloud: '#f1eee3', far: '#c2cabc', mid: '#b3bd9b', near: '#a5b083', wall: '#dccbaa', roof: '#bb9a7c', field: '#aab480', fieldShade: '#a0aa75', tree: '#93a06c' },
  soft: { skyTop: '#e1e3d9', skyMid: '#e6e2d4', skyLow: '#eae1cd', sun: '#efe6cb', cloud: '#eeeade', far: '#dedccb', mid: '#dad8c3', near: '#d6d5bb', wall: '#e2d7be', roof: '#d9c9b0', field: '#d5d4b8', fieldShade: '#d1d0b2', tree: '#cfcfb0' },
}

const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x) }

/** Onda suave con varias frecuencias: perfil de sierras y lomas. */
const ridge = (x: number, seed: number, scale: number) =>
  Math.sin(x / scale + seed) * 0.5 + Math.sin(x / (scale * 0.43) + seed * 2.3) * 0.3 + Math.sin(x / (scale * 0.17) + seed * 5.1) * 0.2

type Context = CanvasRenderingContext2D

/** Trama de Bayer 4×4: transición de color sin degradado. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]

function sky(ctx: Context, w: number, horizon: number, t: Tones) {
  const bands = [t.skyTop, t.skyMid, t.skyLow]
  for (let y = 0; y < horizon; y++) {
    const position = (y / horizon) * (bands.length - 1)
    const band = Math.min(bands.length - 2, Math.floor(position))
    for (let x = 0; x < w; x++) {
      ctx.fillStyle = position - band > (BAYER[(y % 4) * 4 + (x % 4)]! + 0.5) / 16 ? bands[band + 1]! : bands[band]!
      ctx.fillRect(x, y, 1, 1)
    }
  }
}

function disc(ctx: Context, cx: number, cy: number, r: number, color: string) {
  ctx.fillStyle = color
  for (let y = -r; y <= r; y++) {
    const half = Math.round(Math.sqrt(r * r - y * y))
    ctx.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2, 1)
  }
}

function clouds(ctx: Context, w: number, horizon: number, t: Tones, from: number) {
  ctx.fillStyle = t.cloud
  const count = Math.max(3, Math.round(w / 70))
  for (let i = 0; i < count; i++) {
    const x = Math.round(((i + hash(i) * 0.7) / count) * w)
    if (x < from + 6) continue
    const y = Math.round(horizon * (0.08 + hash(i + 40) * 0.5))
    const width = 14 + Math.round(hash(i + 80) * 22)
    ctx.fillRect(x, y, width, 2)
    ctx.fillRect(x + 4, y - 2, width - 10, 2)
    ctx.fillRect(x + 8, y - 4, Math.max(4, width - 22), 2)
    ctx.fillRect(x - 5, y + 2, width - 2, 1)
  }
}

function hills(ctx: Context, w: number, h: number, base: number, amplitude: number, seed: number, scale: number, color: string) {
  ctx.fillStyle = color
  for (let x = 0; x < w; x++) {
    const top = Math.round(base - ridge(x, seed, scale) * amplitude)
    ctx.fillRect(x, top, 1, h - top)
  }
}

function village(ctx: Context, w: number, base: number, t: Tones) {
  for (let x = 4, i = 0; x < w; i++) {
    const width = 7 + Math.round(hash(i + 7) * 7)
    const height = 4 + Math.round(hash(i + 21) * 6)
    if (hash(i + 33) > 0.35) {
      const y = base - height + Math.round(ridge(x, 4, 60) * 2)
      ctx.fillStyle = t.wall
      ctx.fillRect(x, y, width, height + 6)
      ctx.fillStyle = t.roof
      for (let r = 0; r < 3; r++) ctx.fillRect(x - 1 + r, y - 1 - r, width + 2 - r * 2, 1)
      if (width > 9) { ctx.fillStyle = t.skyMid; ctx.fillRect(x + 2, y + 2, 1, 2); ctx.fillRect(x + width - 3, y + 2, 1, 2) }
    } else {
      disc(ctx, x + 4, base - 3, 4, t.tree)
      ctx.fillRect(x + 3, base, 1, 4)
    }
    x += width + 1 + Math.round(hash(i + 55) * 9)
  }
}

function meadow(ctx: Context, w: number, h: number, top: number, t: Tones) {
  ctx.fillStyle = t.field
  ctx.fillRect(0, top, w, h - top)
  ctx.fillStyle = t.fieldShade
  const tufts = Math.round((w * (h - top)) / 55)
  for (let i = 0; i < tufts; i++) ctx.fillRect(Math.floor(hash(i) * w), top + Math.floor(hash(i + 900) * (h - top)), 2 + Math.floor(hash(i + 400) * 3), 1)
}

/** `quiet`: fracción izquierda del cielo sin sol ni nubes, para textos. */
export function drawLandscape(ctx: Context, w: number, h: number, t: Tones, quiet = 0) {
  // En vertical el edificio está arriba: el prado sube para que no parezca flotar.
  const horizon = Math.round(h * (w < h ? 0.36 : 0.6))
  sky(ctx, w, horizon + 12, t)
  disc(ctx, Math.round(w * (quiet > 0 ? quiet + 0.08 : 0.14)), Math.round(h * 0.2), Math.max(7, Math.round(Math.min(w, h) * 0.06)), t.sun)
  clouds(ctx, w, horizon, t, w * quiet)
  hills(ctx, w, h, horizon - 8, 14, 1.3, 46, t.far)
  hills(ctx, w, h, horizon + 2, 9, 4.1, 34, t.mid)
  hills(ctx, w, h, horizon + 13, 5, 7.7, 52, t.near)
  village(ctx, w, horizon + 16, t)
  meadow(ctx, w, h, horizon + 19, t)
}
