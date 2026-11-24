import * as z from 'zod'
import { base64ToBytes, bytesToBase64 } from '@/utils/base64'
import { ConflictError } from './errors'

/** AES-256-GCM con la clave sacada de la contraseña (PBKDF2-SHA-256). Todo con WebCrypto, sin dependencias. */
const VERSION = 1
const ITERATIONS = 600_000
export const MIN_PASSWORD = 10

const envelopeSchema = z.object({ app: z.literal('vita'), encrypted: z.number() })
const bodySchema = z.object({
  // Topes: un archivo manipulado no debe dejar el navegador pensando durante horas.
  iterations: z.int().min(100_000).max(5_000_000), salt: z.base64().max(64), iv: z.base64().max(32), data: z.base64(),
})

const WRONG = 'La contraseña no es correcta o la copia está dañada. No se ha cambiado nada.'

const readJson = (text: string): unknown => { try { return JSON.parse(text) } catch { return undefined } }

export const isEncrypted = (text: string) => envelopeSchema.safeParse(readJson(text)).success

/** Solo existe en HTTPS o en el propio equipo. */
export const canEncrypt = () => (globalThis.crypto as Crypto | undefined)?.subtle !== undefined

export function passwordProblem(password: string, repeated: string): string | undefined {
  if (password.trim().length < MIN_PASSWORD) return `Usa al menos ${MIN_PASSWORD} letras. Tres o cuatro palabras sueltas van bien.`
  return password === repeated ? undefined : 'Las dos no coinciden'
}

async function keyOf(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<CryptoKey> {
  // Una misma tilde se puede escribir de dos formas según el teclado.
  const raw = await crypto.subtle.importKey('raw', new TextEncoder().encode(password.normalize('NFC')), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, raw, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}

/** La cabecera también queda protegida: cambiarla impide abrir la copia. */
const header = (iterations: number, salt: string, iv: string) => new TextEncoder().encode(`vita|${VERSION}|${iterations}|${salt}|${iv}`)

export async function encryptText(text: string, password: string, iterations = ITERATIONS): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const [salt64, iv64] = [bytesToBase64(salt), bytesToBase64(iv)]
  const key = await keyOf(password, salt, iterations)
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: header(iterations, salt64, iv64) }, key, new TextEncoder().encode(text))
  return JSON.stringify({ app: 'vita', encrypted: VERSION, iterations, salt: salt64, iv: iv64, data: bytesToBase64(new Uint8Array(data)) })
}

export async function decryptText(text: string, password: string): Promise<string> {
  const json = readJson(text)
  const envelope = envelopeSchema.safeParse(json)
  if (!envelope.success) throw new ConflictError('El archivo no es una copia cifrada de Vita')
  if (envelope.data.encrypted > VERSION) throw new ConflictError('La copia es de una versión más nueva de Vita')
  if (envelope.data.encrypted !== VERSION) throw new ConflictError(WRONG)
  const body = bodySchema.safeParse(json)
  if (!body.success) throw new ConflictError(WRONG)
  const { iterations, salt, iv, data } = body.data
  try {
    const key = await keyOf(password, base64ToBytes(salt), iterations)
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToBytes(iv), additionalData: header(iterations, salt, iv) }, key, base64ToBytes(data))
    return new TextDecoder().decode(plain)
  } catch {
    throw new ConflictError(WRONG)
  }
}
