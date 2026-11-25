import { getRecordType, RECORD_TYPES } from '@/modules/registry'
import type { ModuleId } from '@/modules/types'
import { accessTo } from '@/services/permissions'
import type { Member } from '@/types/family'
import { isIsoDate } from '@/utils/dates'
import { formatDate } from '@/utils/format'
import * as z from '@/utils/zod'
import { VitaError } from '../errors'
import type { Proposal, Reply } from './types'

export type Hint = 'bill' | 'id' | 'other'

/** Lo que devuelve el servidor: la ficha elegida y sus campos tal como los ha leído el modelo. */
const understoodSchema = z.strictObject({ typeId: z.string().min(1).max(40), data: z.record(z.string(), z.unknown()) })
export type Understood = z.infer<typeof understoodSchema>

export interface CatalogType {
  readonly typeId: string
  readonly name: string
  readonly fields: Readonly<Record<string, { kind: string; label: string; required?: boolean; options?: string[] }>>
}

/** Campos que el modelo no puede rellenar: los escribe la app o apuntan a otras fichas. */
const SKIPPED = new Set(['files', 'links', 'record'])

/** Las fichas que esta persona puede guardar en los módulos activos: el modelo solo elige entre ellas. */
export function catalogFor(actor: Member, enabled: readonly ModuleId[]): CatalogType[] {
  return RECORD_TYPES.filter((type) => enabled.includes(type.moduleId) && accessTo(actor, type.moduleId) === 'write').map((type) => ({
    typeId: type.id,
    name: type.name,
    fields: Object.fromEntries(Object.entries(type.fields)
      .filter(([, field]) => !field.hidden && !SKIPPED.has(field.kind))
      .map(([name, field]) => [name, {
        kind: field.kind, label: field.label, ...(field.required && { required: true }),
        ...('options' in field && { options: field.options.map((o) => o.value) }),
      }])),
  }))
}

const plain = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

export function hintFor(written: string): Hint {
  const said = plain(written)
  if (/\b(factura|recibo|luz|agua|gas|telefono|internet|ticket)\b/.test(said)) return 'bill'
  if (/\b(dni|pasaporte|carne|carnet|nie)\b/.test(said)) return 'id'
  return 'other'
}

/** Sin texto o pidiendo guardarlo, solo se propone la ficha. Si es una pregunta, además contesta el asistente. */
export function savingIntent(written: string): boolean {
  const said = plain(written).trim()
  if (!said) return true
  if (said.includes('?')) return false
  return /^(guarda|guardalo|guardala|apunta|apuntalo|apuntala|anota|sube|registra|archiva|anade)\b/.test(said) || /\b(guardalo|guardala|apuntalo|apuntala)\b/.test(said)
}

/** Una persona solo se asigna si coincide sin dudas con alguien del hogar. */
function holder(name: unknown, members: readonly Member[]): string | undefined {
  if (typeof name !== 'string' || !name.trim()) return undefined
  const words = new Set(plain(name).split(/\s+/))
  const matches = members.filter((m) => plain(m.name).split(/\s+/).every((word) => words.has(word)))
  return matches.length === 1 ? matches[0]!.id : undefined
}

interface ProposalContext { readonly fileId: string; readonly members: readonly Member[]; readonly actorId: string; readonly today: string }

function proposal(typeId: string, data: Record<string, unknown>, notes: string[]): Proposal {
  const type = getRecordType(typeId)
  // Lo que el esquema real no acepta se quita: mejor un hueco que un dato mal leído.
  for (let pass = 0; pass < 5; pass++) {
    const checked = type.schema.safeParse(data)
    if (checked.success) break
    const wrong = [...new Set(checked.error.issues.map((issue) => String(issue.path[0])))].filter((key) => key in data && type.fields[key]?.kind !== 'files')
    if (wrong.length === 0) break
    for (const key of wrong) delete data[key]
  }
  const missing = Object.entries(type.fields).filter(([key, field]) => field.required && data[key] === undefined).map(([, field]) => field.label)
  return { typeId, data, notes, missing, ready: missing.length === 0 && type.schema.safeParse(data).success }
}

const defined = (data: Record<string, unknown>) => Object.fromEntries(Object.entries(data).filter(([, value]) => value !== null && value !== undefined))

export function toProposal(read: Understood, { fileId, members }: ProposalContext): Proposal {
  const type = getRecordType(read.typeId)
  const data: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(read.data)) {
    const field = type.fields[key]
    if (!field || field.hidden || SKIPPED.has(field.kind) || value === null || value === undefined) continue
    if (field.kind === 'member') { const id = holder(value, members); if (id) data[key] = id; continue }
    if (field.kind === 'members') {
      const ids = (Array.isArray(value) ? value : []).map((name) => holder(name, members)).filter((id): id is string => Boolean(id))
      if (ids.length) data[key] = [...new Set(ids)]
      continue
    }
    // Se pidieron céntimos; un importe con decimales son euros.
    data[key] = field.kind === 'money' && typeof value === 'number' && !Number.isInteger(value) ? Math.round(value * 100) : value
  }
  const filesField = Object.entries(type.fields).find(([, field]) => field.kind === 'files')?.[0]
  if (filesField) data[filesField] = [fileId]
  // La caducidad sale del propio documento: la ficha lo recuerda mientras no se cambie.
  if (read.typeId === 'document' && typeof data.expiryDate === 'string') { data.scannedDate = data.expiryDate; data.scannedFile = fileId }
  const dueDate = read.data.dueDate
  const notes = [
    ...(typeof dueDate === 'string' && isIsoDate(dueDate) ? [`Vence el ${formatDate(dueDate)}.`] : []),
    ...(filesField ? [] : ['Este tipo de ficha no guarda archivos: el archivo no se adjunta.']),
  ]
  return proposal(read.typeId, data, notes)
}

const UNAVAILABLE = 'No he podido leer el archivo en el servidor del hogar. Revisa y completa los datos.'

export async function understandFile(file: File, hint: Hint, catalog: readonly CatalogType[], { signal, fetch: request = fetch }: { signal: AbortSignal; fetch?: typeof fetch }): Promise<Understood> {
  const form = new FormData()
  form.set('kind', hint)
  form.set('catalog', JSON.stringify(catalog))
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
  if (!parsed.success || !catalog.some((type) => type.typeId === parsed.data.typeId)) throw new VitaError(UNAVAILABLE)
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
