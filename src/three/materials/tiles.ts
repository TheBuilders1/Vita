import { Painter } from './painter'

export const TILE_SIZE = 64
export const TEXELS_PER_METER = 20

/** fit: la pieza entera ocupa el dibujo. Si no, la textura se repite a densidad constante. */
export interface Tile { readonly layer: number; readonly width: number; readonly height: number; readonly fit: boolean }

interface Design { readonly width: number; readonly height: number; readonly fit: boolean; readonly paint: (p: Painter) => void }

const repeat = (paint: Design['paint']): Design => ({ width: TILE_SIZE, height: TILE_SIZE, fit: false, paint })
const piece = (width: number, height: number, paint: Design['paint']): Design => ({ width, height, fit: true, paint })

const WOOD = { light: '#b59268', mid: '#a68259', dark: '#8b6a45', line: '#6d4f32' }
const DARKWOOD = { light: '#755439', mid: '#66472f', dark: '#543a26', line: '#41301f' }
const INK = '#24344d'
const CREAM = '#f3ead8'

const plaster = (base: string, marks: readonly string[]) => repeat((p) => { p.fill(base).speckle(marks, 0.05) })

const planks = (c: typeof WOOD, rows = 8) => repeat((p) => {
  const h = TILE_SIZE / rows
  for (let r = 0; r < rows; r++) {
    p.rect(0, r * h, TILE_SIZE, h, p.pick([c.light, c.mid, c.mid]))
    for (let n = 0; n < 5; n++) p.rect(Math.floor(p.random() * 60), r * h + 1 + Math.floor(p.random() * (h - 2)), 3 + Math.floor(p.random() * 7), 1, c.dark)
    p.rect(0, r * h + h - 1, TILE_SIZE, 1, c.line)
    p.rect((r * 23 + 9) % TILE_SIZE, r * h, 1, h, c.line)
  }
})

const grain = (c: typeof WOOD) => repeat((p) => {
  p.fill(c.mid)
  for (let n = 0; n < 60; n++) p.rect(Math.floor(p.random() * 64), Math.floor(p.random() * 64), 4 + Math.floor(p.random() * 10), 1, p.pick([c.light, c.dark]))
})

const checks = (a: string, b: string, size: number, grout?: string) => repeat((p) => {
  for (let y = 0; y < 64; y += size) for (let x = 0; x < 64; x += size) {
    p.rect(x, y, size, size, (x / size + y / size) % 2 ? a : b)
    if (grout) p.rect(x, y + size - 1, size, 1, grout).rect(x + size - 1, y, 1, size, grout)
  }
})

const bricks = (colors: readonly string[], mortar: string, w: number, h: number) => repeat((p) => {
  p.fill(mortar)
  for (let r = 0; r < 64 / h; r++) for (let c = -1; c < 64 / w + 1; c++) {
    const x = c * w + (r % 2 ? w / 2 : 0)
    const color = p.pick(colors)
    for (let i = 0; i < w - 1; i++) p.rect((x + i + 64) % 64, r * h, 1, h - 1, color)
  }
})

const weave = (base: string, a: string, b: string) => repeat((p) => {
  p.fill(base)
  for (let y = 0; y < 64; y += 2) for (let x = (y / 2) % 2 * 2; x < 64; x += 4) p.px(x, y, a).px(x + 1, y + 1, b)
})

const rug = (w: number, h: number, base: string, line: string, accent: string) => piece(w, h, (p) => {
  p.fill(base).frame(0, 0, w, h, accent).frame(2, 2, w - 4, h - 4, line)
  for (let x = 5; x < w - 5; x += 4) for (let y = 5; y < h - 5; y += 4) p.px(x, y, (x + y) % 8 === 2 ? accent : line)
})

const picture = (sky: string, hill: string, detail: string) => piece(12, 10, (p) => {
  p.fill(WOOD.line).rect(1, 1, 10, 8, CREAM).rect(2, 2, 8, 6, sky).rect(2, 5, 8, 3, hill).rect(6, 4, 4, 2, hill).px(3, 3, detail).px(4, 3, detail)
})

const cabinet = (base: string, edge: string, knob: string) => piece(12, 16, (p) => {
  p.fill(base).frame(0, 0, 12, 16, edge).frame(2, 2, 8, 12, edge).rect(9, 7, 1, 2, knob)
})

const drawers = (count: number, base: string, edge: string, knob: string) => piece(12, count * 6, (p) => {
  p.fill(base)
  for (let i = 0; i < count; i++) p.frame(0, i * 6, 12, 6, edge).rect(5, i * 6 + 2, 2, 1, knob)
})

const DIGITS: Record<number, readonly string[]> = {
  1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  3: ['.###.', '#...#', '....#', '..##.', '....#', '#...#', '.###.'],
  4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
}
const plaque = (n: number) => piece(11, 11, (p) => { p.fill(INK).frame(0, 0, 11, 11, '#b8a67e').sprite(3, 2, DIGITS[n]!, { '#': CREAM }) })

const SPINES = ['#7a3f2f', '#55602f', '#34496b', '#85501f', '#4a4a46', '#b8a67e', '#8c6a4a', '#3f626b', '#d6c7a9']
const books = (seedShift: number) => piece(24, 8, (p) => {
  p.fill(DARKWOOD.line)
  for (let n = 0; n < seedShift; n++) p.random()
  for (let x = 1; x < 22;) {
    const w = 1 + Math.floor(p.random() * 2)
    const h = 5 + Math.floor(p.random() * 3)
    const color = p.pick(SPINES)
    if (p.random() > 0.1) p.rect(x, 8 - h, w, h, color).px(x, 8 - h + 1, '#e6decd')
    x += w
  }
})

const screen = (paint: (p: Painter) => void, w = 16, h = 10) => piece(w, h, (p) => { p.fill('#1b2434').rect(1, 1, w - 2, h - 2, '#31506a'); paint(p) })

const DESIGNS = {
  // Arquitectura
  plaster: plaster('#eae1cf', ['#e1d6c1', '#f1eadb']),
  plasterOlive: plaster('#a9ab82', ['#9fa177', '#b3b58e']),
  plasterBlue: plaster('#a3b0b4', ['#98a6ab', '#afbbbe']),
  plasterSand: plaster('#d2c0a0', ['#c8b594', '#dccbae']),
  plasterNavy: plaster('#5c6b84', ['#54637c', '#66758d']),
  plasterClay: plaster('#c39a7e', ['#b98f72', '#cca68b']),
  facade: bricks(['#cdb894', '#c6b08b', '#d4c09e', '#bfa981'], '#b29c76', 16, 8),
  stone: bricks(['#8b867b', '#969186', '#827d72', '#9d988d'], '#6f6a60', 16, 16),
  slab: plaster('#b7ab95', ['#aa9e88', '#c2b7a2']),
  slabEdge: repeat((p) => { p.fill('#d8cbb0').speckle(['#cdbfa3', '#e2d6be'], 0.05) }),
  oak: planks(WOOD),
  walnut: planks(DARKWOOD),
  parquet: repeat((p) => {
    for (let y = 0; y < 64; y += 8) for (let x = 0; x < 64; x += 16) {
      const flip = (x / 16 + y / 8) % 2
      p.rect(x, y, 16, 8, flip ? WOOD.mid : WOOD.light)
      for (let i = 0; i < 16; i += 4) p.rect(x + i, y, 1, 8, flip ? WOOD.dark : WOOD.mid)
      p.rect(x, y + 7, 16, 1, WOOD.dark)
    }
  }),
  checker: checks('#e9dfca', '#9a9a86', 8),
  tiles: checks('#dfe0d8', '#d5d8d0', 8, '#b9beb6'),
  tilesWarm: checks('#d9c6a3', '#d0bb95', 8, '#b59f78'),
  subway: bricks(['#f0ebdd', '#e9e3d3', '#f4f0e4'], '#cfc6b2', 8, 4),
  pavement: checks('#a7a196', '#9f998d', 16, '#878176'),
  grass: repeat((p) => { p.fill('#7c8452').speckle(['#6d7546', '#8b9360', '#646c40'], 0.3) }),
  hedge: repeat((p) => { p.fill('#5b6638').speckle(['#4c562d', '#6d7946', '#434c27'], 0.45) }),
  soil: repeat((p) => { p.fill('#5f4632').speckle(['#523b29', '#6d523c'], 0.25) }),
  roof: repeat((p) => {
    for (let y = 0; y < 64; y += 8) for (let x = 0; x < 64; x += 8) {
      p.rect(x, y, 8, 8, p.pick(['#9b5f45', '#a5684c', '#8f563e'])).rect(x, y + 6, 8, 2, '#74432f').rect(x + (y % 16 ? 3 : 7), y, 1, 6, '#83503a')
    }
  }),
  gravel: repeat((p) => { p.fill('#a39c8d').speckle(['#8f887a', '#b5aea0', '#7f796c'], 0.35) }),
  // Materiales
  wood: grain(WOOD),
  darkwood: grain(DARKWOOD),
  white: plaster('#eee9dd', ['#e4decf', '#f5f1e8']),
  marble: repeat((p) => { p.fill('#dcd8cd').speckle(['#c9c4b7', '#e8e5dc'], 0.12) }),
  metal: repeat((p) => { p.fill('#8d949a').speckle(['#7f868c', '#9aa1a7'], 0.12) }),
  darkmetal: repeat((p) => { p.fill('#3d454e').speckle(['#343b43', '#48515b'], 0.12) }),
  brass: repeat((p) => { p.fill('#b0905a').speckle(['#9c7e4b', '#c2a36c'], 0.15) }),
  navy: weave('#34496b', '#2c3f5e', '#3d5478'),
  olive: weave('#6a7440', '#5d6737', '#778250'),
  beige: weave('#d3c3a1', '#c7b692', '#dfd1b3'),
  rust: weave('#8f4f3a', '#814431', '#9d5c46'),
  greyCloth: weave('#8a8a82', '#7e7e76', '#96968e'),
  linen: weave('#ebe3d1', '#e0d6c1', '#f3ecdd'),
  terracotta: plaster('#a8694a', ['#9a5d40', '#b47656']),
  leaves: repeat((p) => { p.fill('#5f6c3c').speckle(['#4f5b30', '#738049', '#465129'], 0.4) }),
  leavesDry: repeat((p) => { p.fill('#8a8a4e').speckle(['#7b7b43', '#9b9b5d'], 0.35) }),
  paper: plaster('#f2ecdd', ['#e6dfcd']),
  water: repeat((p) => { p.fill('#7d9ba3').speckle(['#8daab1', '#6f8d95'], 0.2) }),
  lamp: plaster('#f6e3b0', ['#f2d998']),
  leather: plaster('#6f4a33', ['#643f2a', '#7b553d']),
  skin: plaster('#c9a27e', ['#be966f']),
  // Piezas con dibujo
  window: piece(24, 18, (p) => {
    p.fill('#e9e1cf').rect(2, 2, 20, 14, '#a9c0c6').rect(2, 10, 20, 6, '#8e9a6a').rect(2, 9, 8, 2, '#8e9a6a').rect(14, 8, 8, 3, '#7f8b5c')
    p.rect(4, 4, 5, 1, '#c8d8da').rect(15, 3, 4, 1, '#c8d8da').rect(11, 1, 2, 16, '#e9e1cf').rect(1, 8, 22, 1, '#e9e1cf').frame(0, 0, 24, 18, '#b8a67e')
  }),
  fridgeDoor: piece(18, 38, (p) => {
    p.fill('#d9d6cb').frame(0, 0, 18, 38, '#a8a498').rect(0, 13, 18, 1, '#8d897d').rect(14, 5, 1, 6, '#6d6a61').rect(14, 16, 1, 9, '#6d6a61')
    p.rect(3, 17, 4, 4, '#f3ead8').rect(8, 19, 3, 3, '#b8a67e').px(4, 16, '#8c2c20').px(9, 18, '#55602f').rect(4, 4, 6, 3, '#c9c5b8')
  }),
  oven: piece(14, 16, (p) => {
    p.fill('#54585c').frame(0, 0, 14, 16, '#3a3d41').rect(2, 5, 10, 8, '#23272c').rect(3, 6, 8, 3, '#8a5a36').rect(2, 2, 1, 1, CREAM).rect(5, 2, 1, 1, CREAM).rect(8, 2, 1, 1, CREAM).rect(11, 2, 1, 1, '#c98a3f').rect(2, 4, 10, 1, '#8d949a')
  }),
  hob: piece(14, 12, (p) => { p.fill('#2d3238').frame(2, 2, 4, 4, '#6a7077').frame(8, 2, 4, 4, '#6a7077').frame(2, 7, 4, 4, '#a0552f').frame(8, 7, 4, 4, '#6a7077') }),
  cabinetOlive: cabinet('#7c8452', '#646c40', '#d6c7a9'),
  cabinetCream: cabinet('#e4d8be', '#c3b48f', '#7a4a28'),
  cabinetWood: cabinet(WOOD.mid, WOOD.line, '#e6decd'),
  cabinetWhite: cabinet('#e9e6dc', '#bfbcae', '#6f675a'),
  cabinetBlue: cabinet('#6d8087', '#56686f', '#e6decd'),
  drawersWood: drawers(3, WOOD.mid, WOOD.line, '#e6decd'),
  drawersMetal: drawers(4, '#7f8a86', '#5f6a66', '#e6decd'),
  drawersNavy: drawers(4, '#4a5c78', '#34435c', '#d6c7a9'),
  booksA: books(0), booksB: books(7), booksC: books(19), booksD: books(31),
  pantry: piece(24, 8, (p) => {
    p.fill(DARKWOOD.line)
    for (let x = 1, n = 0; x < 22; n++) { const w = 3 + (n % 2); const h = 4 + (n % 3); p.rect(x, 8 - h, w, h, p.pick(['#b98a58', '#8c6a4a', '#a3a87c', '#d6c7a9', '#8f4f3a'])).rect(x, 8 - h, w, 1, '#e6decd'); x += w + 1 }
  }),
  medicines: piece(16, 18, (p) => {
    p.fill('#f0ede3').frame(0, 0, 16, 18, '#9aa39f').rect(1, 6, 14, 1, '#9aa39f').rect(1, 12, 14, 1, '#9aa39f')
    for (let r = 0; r < 3; r++) for (let x = 2; x < 13; x += 3) { const h = 2 + Math.floor(p.random() * 3); p.rect(x, [6, 12, 17][r]! - h, 2, h, p.pick(['#8c5a44', '#6d8087', '#7c8452', '#c3b48f'])) }
  }),
  cross: piece(12, 12, (p) => { p.fill('#eee9dd').frame(0, 0, 12, 12, '#55602f').rect(5, 2, 2, 8, '#55602f').rect(2, 5, 8, 2, '#55602f') }),
  alarm: piece(14, 14, (p) => {
    p.fill('#8c2c20').frame(0, 0, 14, 14, '#6a1e15').sprite(3, 3, ['...##...', '..####..', '..####..', '.######.', '.######.', '########', '........', '...##...'], { '#': CREAM })
  }),
  phone: piece(8, 12, (p) => { p.fill('#2d3238').rect(1, 1, 2, 10, '#8c2c20').rect(4, 2, 3, 2, '#a9c0c6'); for (let y = 5; y < 11; y += 2) for (let x = 4; x < 7; x++) p.px(x, y, '#d6c7a9') }),
  blackboard: piece(34, 18, (p) => {
    p.fill('#7a4a28').rect(1, 1, 32, 16, '#3b4a42').rect(4, 4, 8, 1, '#dfe0d8').rect(4, 7, 12, 1, '#b9beb6').rect(4, 10, 6, 1, '#b9beb6').frame(20, 4, 9, 7, '#dfe0d8').px(24, 7, '#dfe0d8').rect(19, 13, 11, 1, '#c9b98f')
  }),
  cork: piece(24, 16, (p) => {
    p.fill('#b98a58').frame(0, 0, 24, 16, '#6f4626').speckle(['#a87848', '#c79a68'], 0.2).frame(0, 0, 24, 16, '#6f4626')
    p.rect(3, 3, 5, 6, '#f2ecdd').rect(10, 2, 6, 5, '#dfe0d8').rect(17, 5, 4, 5, '#e2cf9c').rect(6, 10, 6, 4, '#c9d0b4').rect(14, 11, 5, 3, '#f2ecdd')
    p.px(5, 3, '#8c2c20').px(12, 2, '#34496b').px(19, 5, '#55602f').rect(4, 5, 3, 1, '#8a8a82').rect(11, 4, 4, 1, '#8a8a82')
  }),
  calendar: piece(12, 14, (p) => {
    p.fill('#f2ecdd').rect(0, 0, 12, 4, '#7a3f2f').frame(0, 0, 12, 14, '#6f675a')
    for (let y = 6; y < 13; y += 2) for (let x = 2; x < 11; x += 2) p.px(x, y, '#6f675a')
    p.px(6, 8, '#8c2c20').px(4, 10, '#55602f')
  }),
  certificate: piece(12, 10, (p) => { p.fill('#7a4a28').rect(1, 1, 10, 8, '#f2ecdd').rect(3, 3, 6, 1, '#34496b').rect(3, 5, 5, 1, '#8a8a82').rect(8, 6, 2, 2, '#8f4f3a') }),
  growth: piece(6, 26, (p) => { p.fill('#e6d6b4').frame(0, 0, 6, 26, '#a87848'); for (let y = 2; y < 25; y += 3) p.rect(1, y, y % 6 === 2 ? 4 : 2, 1, '#7a4a28'); p.px(4, 9, '#55602f').px(4, 15, '#7a3f2f') }),
  map: piece(22, 15, (p) => {
    p.fill('#7a4a28').rect(1, 1, 20, 13, '#a3b7b5').rect(3, 3, 6, 5, '#a3a87c').rect(5, 8, 3, 4, '#a3a87c').rect(11, 3, 8, 4, '#b9b48a').rect(12, 7, 4, 4, '#a3a87c').rect(17, 10, 3, 2, '#b9b48a').px(6, 5, '#8c2c20').px(13, 5, '#8c2c20')
  }),
  paintingA: picture('#b7c3bd', '#7c8452', '#f3ead8'),
  paintingB: picture('#d9c096', '#8f4f3a', '#f3ead8'),
  paintingC: picture('#8ea1ad', '#4a5c78', '#e2cf9c'),
  photo: piece(8, 8, (p) => { p.fill('#59361d').rect(1, 1, 6, 6, '#cbb68f').rect(2, 3, 2, 3, '#6a7440').rect(4, 2, 2, 4, '#7a3f2f').px(2, 2, '#c9a27e').px(4, 1, '#c9a27e') }),
  photoB: piece(8, 8, (p) => { p.fill('#24344d').rect(1, 1, 6, 6, '#a9bcc0').rect(1, 4, 6, 3, '#a3a87c').rect(3, 3, 2, 3, '#34496b').px(3, 2, '#c9a27e') }),
  tv: screen((p) => { p.rect(2, 2, 24, 8, '#3f626b').rect(2, 10, 24, 4, '#a9bcc0').rect(4, 4, 7, 5, '#c9a27e').rect(13, 4, 10, 1, '#e6decd').rect(13, 6, 8, 1, '#c8d8da').rect(3, 12, 14, 1, '#24344d') }, 28, 16),
  screenCode: screen((p) => { p.rect(2, 2, 6, 1, '#c8d8da').rect(3, 4, 8, 1, '#a3a87c').rect(3, 6, 5, 1, '#e2cf9c') }),
  screenChart: screen((p) => { p.rect(2, 6, 2, 3, '#a3a87c').rect(5, 4, 2, 5, '#e2cf9c').rect(8, 5, 2, 4, '#a3a87c').rect(11, 2, 2, 7, '#c98a5f') }),
  screenLock: screen((p) => { p.sprite(6, 2, ['.##.', '#..#', '####', '####', '####'], { '#': '#e2cf9c' }) }),
  server: piece(12, 22, (p) => { p.fill('#343b43').frame(0, 0, 12, 22, '#24292f'); for (let y = 2; y < 20; y += 4) p.rect(2, y, 8, 2, '#1d2227').px(3, y, '#a3a87c').px(5, y, y % 8 ? '#e2cf9c' : '#a3a87c') }),
  shield: piece(12, 14, (p) => { p.sprite(0, 0, Array.from({ length: 14 }, () => '############'), { '#': '#5c6b84' }).sprite(1, 1, ['##########', '##########', '##########', '####..####', '###....###', '##########', '.########.', '.########.', '..######..', '...####...', '....##....'], { '#': CREAM }).sprite(3, 3, ['....#', '...##', '#.##.', '###..', '.#...'], { '#': '#55602f' }) }),
  safe: piece(18, 18, (p) => {
    p.fill('#4b545d').frame(0, 0, 18, 18, '#343b43').frame(2, 2, 14, 14, '#5f6a74').rect(7, 7, 4, 4, '#b0905a').rect(8, 5, 2, 8, '#b0905a').rect(5, 8, 8, 2, '#b0905a').rect(14, 4, 1, 3, '#b0905a').rect(14, 11, 1, 3, '#b0905a')
  }),
  ledger: piece(12, 8, (p) => { p.fill('#f2ecdd').rect(6, 0, 1, 8, '#b8a67e'); for (let y = 1; y < 8; y += 2) p.rect(1, y, 4, 1, '#8a8a82').rect(8, y, 3, 1, '#8a8a82'); p.px(4, 3, '#8c2c20') }),
  newspaper: piece(12, 9, (p) => { p.fill('#e6e0d0').rect(1, 1, 10, 1, '#24344d').rect(1, 3, 4, 3, '#8a8a82'); for (let y = 3; y < 8; y += 2) p.rect(6, y, 5, 1, '#8a8a82') }),
  keyboard: piece(12, 4, (p) => { p.fill('#54585c'); for (let y = 1; y < 3; y++) for (let x = 1; x < 11; x += 2) p.px(x, y, '#c3b48f') }),
  doorWood: piece(16, 40, (p) => { p.fill(WOOD.dark).frame(0, 0, 16, 40, WOOD.line).frame(3, 4, 10, 13, WOOD.line).frame(3, 21, 10, 15, WOOD.line).rect(13, 20, 1, 2, '#e2cf9c') }),
  doorEntry: piece(20, 42, (p) => { p.fill(INK).frame(0, 0, 20, 42, '#162238').rect(4, 5, 12, 12, '#e2cf9c').rect(9, 5, 2, 12, INK).rect(4, 10, 12, 1, INK).frame(4, 22, 12, 15, '#162238').rect(16, 21, 1, 3, '#b0905a') }),
  liftBack: piece(30, 48, (p) => { p.fill('#6c5a44').frame(0, 0, 30, 48, '#4d3f2f'); for (let x = 5; x < 30; x += 6) p.rect(x, 0, 1, 48, '#5f4f3b') }),
  liftCab: piece(26, 38, (p) => { p.fill('#d8b982').frame(0, 0, 26, 38, '#7a4a28').rect(12, 1, 1, 36, '#b98a58').rect(2, 24, 22, 1, '#8d949a').rect(3, 4, 8, 14, '#e6cf9f').rect(15, 4, 8, 14, '#e6cf9f') }),
  rugNavy: rug(40, 22, '#4a5c78', '#8ea1ad', '#d6c7a9'),
  rugRust: rug(44, 24, '#8f5a45', '#c9a27e', '#e6decd'),
  rugOlive: rug(32, 24, '#7c8452', '#b3b58e', '#e6decd'),
  bedding: piece(20, 32, (p) => { p.fill('#8ea1ad').rect(0, 0, 20, 8, '#f3ead8').rect(2, 1, 16, 5, '#e6decd').rect(0, 9, 20, 2, '#f3ead8'); for (let y = 14; y < 32; y += 6) p.rect(0, y, 20, 1, '#7a8f9c') }),
  eyechart: piece(10, 16, (p) => { p.fill('#f2ecdd').frame(0, 0, 10, 16, '#9aa39f').rect(3, 2, 4, 3, INK).rect(2, 6, 2, 2, INK).rect(6, 6, 2, 2, INK).rect(2, 10, 1, 1, INK).rect(4, 10, 1, 1, INK).rect(6, 10, 1, 1, INK).rect(2, 12, 6, 1, '#8a8a82') }),
  mirror: piece(12, 14, (p) => { p.fill('#b0905a').rect(1, 1, 10, 12, '#b9ccd0').rect(3, 2, 1, 6, '#dbe6e7').rect(4, 5, 1, 6, '#cddadc') }),
  plaque1: plaque(1), plaque2: plaque(2), plaque3: plaque(3), plaque4: plaque(4), plaque5: plaque(5),
} satisfies Record<string, Design>

export type TileName = keyof typeof DESIGNS

const entries = Object.entries(DESIGNS) as [TileName, Design][]
export const TILE_COUNT = entries.length

export const TILE = Object.fromEntries(
  entries.map(([name, { width, height, fit }], layer) => [name, { layer, width, height, fit }]),
) as Record<TileName, Tile>

/** Todas las capas seguidas, de abajo arriba como las lee WebGL. Los dibujos se repiten hasta llenar la capa. */
export function paintTiles(): Uint8Array {
  const out = new Uint8Array(TILE_COUNT * TILE_SIZE * TILE_SIZE * 4)
  entries.forEach(([, design], layer) => {
    const p = new Painter(design.width, design.height, layer * 7919 + 17)
    design.paint(p)
    for (let y = 0; y < TILE_SIZE; y++) {
      const row = design.height - 1 - (y % design.height)
      for (let x = 0; x < TILE_SIZE; x++) {
        const from = (row * design.width + (x % design.width)) * 4
        out.set(p.pixels.subarray(from, from + 4), ((layer * TILE_SIZE + y) * TILE_SIZE + x) * 4)
      }
    }
  })
  return out
}
