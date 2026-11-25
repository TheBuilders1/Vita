import { getRecordType } from '@/modules/registry'
import type { Member } from '@/types/family'
import { isIsoDate } from '@/utils/dates'
import { formatDate } from '@/utils/format'
import * as z from '@/utils/zod'
import { VitaError } from '../errors'
import type { Proposal, Reply } from './types'

export type Hint = 'bill' | 'id' | 'other'

const date = z.string().refine(isIsoDate).nullable()
const text = z.string().trim().min(1).max(120)
const understoodSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('bill'), concept: text, supplier: text.nullable(), amountCents: z.number().int().min(1).nullable(), date, dueDate: date,
    category: z.enum(['home', 'food', 'health', 'education', 'transport', 'leisure', 'clothing', 'pets', 'insurance', 'other']),
  }),
  z.strictObject({
    type: z.literal('document'), kind: z.enum(['id', 'passport', 'healthCard', 'school', 'insurance', 'contract', 'admin', 'other']),
    title: text, holderName: text.nullable(), issueDate: date, expiryDate: date,
  }),
])
export type Understood = z.infer<typeof understoodSchema>

const plain = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

export function hintFor(written: string): Hint {
  const said = plain(written)
  if (/\b(factura|recibo|luz|agua|gas|telefono|internet|ticket)\b/.test(said)) return 'bill'
  if (/\b(dni|pasaporte|carne|carnet|nie)\b/.test(said)) return 'id'
  return 'other'
}

/** Sin texto o pidiendo guardarlo: se lee y se propone la ficha. Una pregunta va al asistente con el archivo. */
export function savingIntent(written: string): boolean {
  const said = plain(written).trim()
  if (!said) return true
  if (said.includes('?')) return false
  return /^(guarda|guardalo|guardala|apunta|apuntalo|apuntala|anota|sube|registra|archiva|anade)\b/.test(said) || /\b(guardalo|guardala|apuntalo|apuntala)\b/.test(said)
}

/** El titular solo se asigna si coincide sin dudas con una persona del hogar. */
function holder(name: string | null, members: readonly Member[]): string | undefined {
  if (!name) return undefined
  const words = new Set(plain(name).split(/\s+/))
  const matches = members.filter((m) => plain(m.name).split(/\s+/).every((word) => words.has(word)))
  return matches.length === 1 ? matches[0]!.id : undefined
}

interface ProposalContext { readonly fileId: string; readonly members: readonly Member[]; readonly actorId: string; readonly today: string }

function proposal(typeId: string, data: Record<string, unknown>, notes: string[]): Proposal {
  const fields = getRecordType(typeId).fields
  const missing = Object.entries(fields).filter(([key, field]) => field.required && data[key] === undefined).map(([, field]) => field.label)
  return { typeId, data, notes, missing, ready: missing.length === 0 }
}

const defined = (data: Record<string, unknown>) => Object.fromEntries(Object.entries(data).filter(([, value]) => value !== null && value !== undefined))

export function toProposal(read: Understood, { fileId, members, today }: ProposalContext): Proposal {
  if (read.type === 'bill') {
    return proposal('transaction', defined({
      kind: 'expense', concept: read.concept, amount: read.amountCents, category: read.category, date: read.date ?? read.dueDate ?? today, files: [fileId],
    }), read.dueDate ? [`Vence el ${formatDate(read.dueDate)}.`] : [])
  }
  return proposal('document', defined({
    kind: read.kind, title: read.title, member: holder(read.holderName, members), issueDate: read.issueDate, expiryDate: read.expiryDate,
    // La caducidad sale del propio documento: la ficha lo recuerda mientras no se cambie.
    scannedDate: read.expiryDate, scannedFile: read.expiryDate ? fileId : undefined, files: [fileId],
  }), [])
}

const UNAVAILABLE = 'No he podido leer el documento en el servidor del hogar. Revisa y completa los datos.'

export async function understandFile(file: File, hint: Hint, { signal, fetch: request = fetch }: { signal: AbortSignal; fetch?: typeof fetch }): Promise<Understood> {
  const form = new FormData()
  form.set('kind', hint)
  form.set('file', file, file.name || 'documento')
  let response: Response
  try {
    response = await request('/api/v1/documents/understand', { method: 'POST', headers: { 'x-vita': '1' }, body: form, signal })
  } catch (error) {
    if (signal.aborted) throw error
    throw new VitaError(UNAVAILABLE)
  }
  if (!response.ok) throw new VitaError(UNAVAILABLE)
  const parsed = understoodSchema.safeParse(await response.json().catch(() => null))
  if (!parsed.success) throw new VitaError(UNAVAILABLE)
  return parsed.data
}

interface ProposeOptions {
  /** Guarda el archivo en el dispositivo y devuelve su id: la ficha lo llevará adjunto. */
  readonly store: (file: File) => Promise<string>
  /** Sin servidor no hay quien lea el documento por dentro. */
  readonly read?: (file: File, hint: Hint, signal: AbortSignal) => Promise<Understood>
  readonly members: readonly Member[]
  readonly actorId: string
  readonly today: string
  readonly signal: AbortSignal
}

function prepared(file: File, fileId: string, hint: Hint, { actorId, today }: ProposeOptions): Proposal {
  if (hint === 'bill') return proposal('transaction', { kind: 'expense', concept: 'Factura', category: 'home', date: today, files: [fileId] }, [])
  const title = file.name.replace(/\.[^.]*$/, '').trim() || 'Documento'
  return proposal('document', defined({ kind: hint === 'id' ? 'id' : 'other', title, member: hint === 'id' ? actorId : undefined, files: [fileId] }), [])
}

/** Pegar o adjuntar para guardar: el modelo lee cada archivo y Vita propone su ficha. Nada se guarda en la ficha sin confirmar. */
export async function proposeFromFiles(files: readonly File[], written: string, options: ProposeOptions): Promise<Reply> {
  const hint = hintFor(written)
  const proposals: Proposal[] = []
  let failed = false
  for (const file of files) {
    const fileId = await options.store(file)
    if (!options.read) { proposals.push(prepared(file, fileId, hint, options)); continue }
    try {
      proposals.push(toProposal(await options.read(file, hint, options.signal), { ...options, fileId }))
    } catch (error) {
      if (options.signal.aborted) throw error
      failed = true
      proposals.push(prepared(file, fileId, hint, options))
    }
  }
  const one = proposals.length === 1
  const message = !options.read
    ? `Sin el servidor del hogar no puedo leer ${one ? 'el archivo' : 'los archivos'} por dentro. ${one ? 'Lo he' : 'Los he'} preparado para guardar: revisa los datos.`
    : failed
      ? 'No he podido leer todo el contenido. He preparado la ficha con lo que sé: revísala y complétala.'
      : `He leído ${one ? 'el documento' : 'los documentos'}. Revisa los datos antes de guardar.`
  return { kind: 'proposals', text: message, proposals }
}
