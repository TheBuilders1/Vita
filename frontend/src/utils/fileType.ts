import { ACCEPTED_TYPES } from '@/types/records'

const HEADER_BYTES = 16
const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'heim', 'heis', 'mif1', 'msf1'])

function typeFromHeader(header: string): string | undefined {
  if (header.startsWith('\xff\xd8\xff')) return 'image/jpeg'
  if (header.startsWith('\x89PNG\r\n\x1a\n')) return 'image/png'
  if (/^GIF8[79]a/.test(header)) return 'image/gif'
  if (header.startsWith('RIFF') && header.slice(8, 12) === 'WEBP') return 'image/webp'
  if (header.startsWith('%PDF-')) return 'application/pdf'
  if (header.slice(4, 8) === 'ftyp' && HEIC_BRANDS.has(header.slice(8, 12))) return 'image/heic'
  return undefined
}

/** Algunos móviles entregan las fotos sin tipo o como JPG siendo HEIC: se mira el contenido. Lo demás conserva su tipo. */
export async function resolveType(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.slice(0, HEADER_BYTES).arrayBuffer())
  const found = typeFromHeader(String.fromCharCode(...bytes))
  if (found === 'image/heic') return found
  if ((ACCEPTED_TYPES as readonly string[]).includes(file.type)) return file.type
  if (found) return found
  return file.type === '' && /\.txt$/i.test(file.name) ? 'text/plain' : file.type
}
