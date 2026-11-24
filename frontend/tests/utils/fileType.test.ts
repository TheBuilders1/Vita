import { expect, test } from 'vitest'
import { resolveType } from '@/utils/fileType'

const bytes = (...parts: (string | number[])[]) => new Uint8Array(parts.flatMap((p) => (typeof p === 'string' ? [...p].map((c) => c.charCodeAt(0)) : p)))
const file = (content: Uint8Array<ArrayBuffer> | string, name: string, type = '') => new File([content], name, { type })
const heic = bytes([0, 0, 0, 24], 'ftyp', 'heic', [0, 0, 0, 0])

test.each([
  ['foto JPG', bytes([0xff, 0xd8, 0xff, 0xe0]), 'image/jpeg'],
  ['PNG', bytes([0x89], 'PNG', [0x0d, 0x0a, 0x1a, 0x0a]), 'image/png'],
  ['GIF', bytes('GIF89a'), 'image/gif'],
  ['WebP', bytes('RIFF', [1, 2, 3, 4], 'WEBP'), 'image/webp'],
  ['PDF', bytes('%PDF-1.7'), 'application/pdf'],
  ['foto HEIC del móvil', heic, 'image/heic'],
])('reconoce por su contenido un %s que llega sin tipo', async (_, content, type) => {
  expect(await resolveType(file(content, 'sin-extension'))).toBe(type)
  expect(await resolveType(file(content, 'a.bin', 'application/octet-stream'))).toBe(type)
})
test('respeta el tipo cuando ya es uno admitido', async () => expect(await resolveType(file('contenido', 'dni.pdf', 'application/pdf'))).toBe('application/pdf'))
test('una foto HEIC no se cuela como JPG por su nombre', async () => expect(await resolveType(file(heic, 'a.jpg', 'image/jpeg'))).toBe('image/heic'))
test('un texto sin tipo se reconoce por la extensión', async () => expect(await resolveType(file('hola', 'NOTA.TXT'))).toBe('text/plain'))
test.each([['<svg/>', 'a.svg', 'image/svg+xml'], ['<html>', 'a.html', 'text/html'], ['MZ', 'a.exe', 'application/x-msdownload'], ['', 'nada', '']])('no da por bueno %j', async (content, name, type) => expect(await resolveType(file(content, name, type))).toBe(type))
