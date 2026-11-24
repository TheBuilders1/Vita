import { expect, test } from 'vitest'
import { carriesMetadata, fitWithin, jpgName, needsReduction } from '@/utils/photo'

test.each([[4000, 3000, 2400, 1800], [3000, 4000, 1800, 2400], [2400, 100, 2400, 100], [800, 600, 800, 600], [10000, 1, 2400, 1]])('%d×%d cabe en 2400', (w, h, width, height) => expect(fitWithin(w, h)).toEqual({ width, height }))

const MB = 1024 * 1024
test.each([['image/jpeg', 2 * MB, true], ['image/png', 2 * MB, true], ['image/jpeg', MB, false], ['image/heic', 100, true], ['image/webp', 2 * MB, false], ['image/webp', 16 * MB, true], ['image/gif', 20 * MB, false], ['application/pdf', 20 * MB, false]])('%s de %d bytes: reducir %s', (type, size, expected) => expect(needsReduction(type, size)).toBe(expected))

test.each([['DNI.png', 'DNI.jpg'], ['IMG_1.HEIC', 'IMG_1.jpg'], ['foto.delante.jpeg', 'foto.delante.jpg'], ['sin', 'sin.jpg'], ['.png', 'foto.jpg']])('%s pasa a %s', (name, expected) => expect(jpgName(name)).toBe(expected))

const bytes = (text: string) => Uint8Array.from(text, (c) => c.charCodeAt(0))
test.each([
  ['image/jpeg', 'lo que sea', true], ['image/png', '\x89PNG...IHDR...eXIf...', true], ['image/png', '\x89PNG...IHDR...IDAT', false], ['image/png', '\x89PNG...iTXtXML:com.adobe.xmp', true],
  ['image/webp', 'RIFF....WEBPVP8X....EXIF', true], ['image/webp', 'RIFF....WEBPVP8X....XMP ', true], ['image/webp', 'RIFF....WEBPVP8 ', false], ['image/gif', 'GIF89a', false], ['application/pdf', '%PDF EXIF', false],
])('%s con «%s»: puede llevar la ubicación %s', (type, content, expected) => expect(carriesMetadata(type, bytes(content))).toBe(expected))
