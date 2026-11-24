import { ValidationError } from '@/services/errors'
import { MAX_FILE_BYTES } from '@/types/records'
import { resolveType } from './fileType'

/** Suficiente para leer la letra pequeña de un documento. */
const MAX_SIDE = 2400
const BIG_BYTES = 1.5 * 1024 * 1024
const QUALITY = 0.85

export function fitWithin(width: number, height: number): { width: number; height: number } {
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/** HEIC no se ve en casi ningún navegador: se convierte siempre que este sepa leerlo. */
export function needsReduction(type: string, size: number): boolean {
  if (type === 'image/heic') return true
  if (type === 'image/jpeg' || type === 'image/png') return size > BIG_BYTES
  return type === 'image/webp' && size > MAX_FILE_BYTES
}

/** Las cámaras anotan dónde se hizo la foto. Un JPG casi siempre lleva datos; en los demás se busca la marca. */
export function carriesMetadata(type: string, bytes: Uint8Array): boolean {
  if (type === 'image/jpeg') return true
  const marks = type === 'image/png' ? ['eXIf', 'XML:com.adobe.xmp'] : type === 'image/webp' ? ['EXIF', 'XMP '] : []
  if (marks.length === 0) return false
  const text = new TextDecoder('latin1').decode(bytes)
  return marks.some((mark) => text.includes(mark))
}

export function jpgName(name: string): string {
  const base = name.replace(/\.[^.]*$/, '')
  return `${base || 'foto'}.jpg`
}

async function redraw(file: Blob, output: 'image/jpeg' | 'image/png'): Promise<Blob | null> {
  // Sin opciones, el navegador ya aplica el giro que anota la cámara.
  const image = await createImageBitmap(file)
  const { width, height } = fitWithin(image.width, image.height)
  const canvas = Object.assign(document.createElement('canvas'), { width, height })
  const context = canvas.getContext('2d')
  if (!context) return null
  if (output === 'image/jpeg') {
    // JPG no tiene transparencia: sin fondo saldría negro.
    context.fillStyle = '#fff'
    context.fillRect(0, 0, width, height)
  }
  context.drawImage(image, 0, 0, width, height)
  image.close()
  return new Promise((resolve) => { canvas.toBlob(resolve, output, QUALITY) })
}

const UNREADABLE = 'Esta foto no se puede leer. Puede estar dañada: prueba con otra.'
const HEIC = 'Esta foto está en formato HEIC y este navegador no sabe leerlo. Guárdala como JPG y vuelve a elegirla.'

/** Deja la foto lista para guardar: sin la ubicación y, si es grande, reducida en vez de rechazada. Lo demás pasa igual. */
export async function preparePhoto(file: File): Promise<File> {
  const type = await resolveType(file)
  const big = needsReduction(type, file.size)
  const tagged = carriesMetadata(type, type === 'image/png' || type === 'image/webp' ? new Uint8Array(await file.arrayBuffer()) : new Uint8Array())
  if (!big && !tagged) return file
  // Al redibujarla se pierde todo lo anotado. Un PNG pequeño se queda en PNG: no pierde nitidez.
  const output = type === 'image/png' && !big ? 'image/png' : 'image/jpeg'
  const clean = await redraw(file, output).catch(() => null)
  if (clean && (tagged || type === 'image/heic' || clean.size < file.size)) return new File([clean], output === 'image/png' ? file.name : jpgName(file.name), { type: output })
  if (type === 'image/heic') throw new ValidationError({ files: HEIC })
  // Guardarla tal cual dejaría dentro la ubicación.
  if (tagged) throw new ValidationError({ files: UNREADABLE })
  return file
}
