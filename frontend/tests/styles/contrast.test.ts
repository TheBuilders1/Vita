import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { LANDSCAPE } from '@/components/backdrop/landscape'

const css = readFileSync(new URL('../../src/styles/tokens.css', import.meta.url), 'utf8')

function colorsIn(block: RegExp): Record<string, string> {
  const body = block.exec(css)?.[1] ?? ''
  return Object.fromEntries([...body.matchAll(/--color-([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1]!, m[2]!]))
}
const normal = colorsIn(/@theme\s*{([^}]*)}/)
const high = { ...normal, ...colorsIn(/\[data-contrast='high'\]\s*{([^}]*)}/) }

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function ratio(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

const FLOORS = ['food', 'education', 'health', 'finance', 'leisure'].map((f) => `floor-${f}`)
const CATEGORIES = ['event', 'appointment', 'medication', 'school', 'birthday', 'holiday', 'reminder', 'deadline', 'meal'].map((c) => `cat-${c}`)
const text: [string, string][] = [
  ...CATEGORIES.flatMap((c): [string, string][] => [[c, 'crema'], ['crema', c]]),
  ...['yeso', 'crema', 'beige'].flatMap((bg): [string, string][] => [['tinta', bg], ['apagado', bg]]),
  ...['marino', 'oliva', 'peligro', 'madera', ...FLOORS].map((bg): [string, string] => ['crema', bg]),
  ...['info', 'exito', 'aviso', 'error'].map((s): [string, string] => ['tinta', `${s}-fondo`]),
  ['peligro', 'crema'], ['peligro', 'yeso'], ['beige', 'marino'],
  ...FLOORS.map((f): [string, string] => [f, 'crema']),
]
const controls: [string, string][] = [['borde', 'crema'], ['borde', 'yeso'], ['foco', 'crema'], ['foco', 'yeso'], ['foco-claro', 'marino']]

describe.each([['normal', normal, 4.5, 3], ['alto', high, 7, 4.5]] as const)('contraste %s', (_name, colors, minText, minControl) => {
  test.each(text)('texto %s sobre %s', (fg, bg) => expect(ratio(colors[fg]!, colors[bg]!)).toBeGreaterThanOrEqual(minText))
  test.each(controls)('control %s sobre %s', (fg, bg) => expect(ratio(colors[fg]!, colors[bg]!)).toBeGreaterThanOrEqual(minControl))
})

test('el texto principal alcanza el nivel AAA también en contraste normal', () => {
  expect(ratio(normal.tinta!, normal.yeso!)).toBeGreaterThanOrEqual(7)
})

describe('el paisaje de fondo no estorba la lectura', () => {
  test.each(Object.entries(LANDSCAPE.full))('texto principal sobre %s', (_n, color) => expect(ratio(normal.tinta!, color)).toBeGreaterThanOrEqual(4.5))
  test.each(Object.entries(LANDSCAPE.soft))('texto secundario sobre %s suave', (_n, color) => expect(ratio(normal.apagado!, color)).toBeGreaterThanOrEqual(4.5))
})
