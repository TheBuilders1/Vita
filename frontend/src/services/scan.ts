import * as z from '@/utils/zod'
import { isIsoDate } from '@/utils/dates'
import { VitaError } from './errors'

export type ScanOutcome = { readonly status: 'found'; readonly date: string } | { readonly status: 'missing' | 'ambiguous' | 'failed' }

export interface ScanOptions {
  readonly file: File
  readonly household: string
  readonly signal: AbortSignal
  readonly fetch?: typeof fetch
  readonly wait?: (ms: number) => Promise<void>
}

const POLL_MS = 1000
/** El servidor corta a los dos minutos; esto cubre también la cola. */
const MAX_POLLS = 180
const MAX_FAILED_POLLS = 5

const uploadSchema = z.object({ documentId: z.uuid() })
const acceptedSchema = z.object({ runId: z.uuid() })
const runSchema = z.object({ status: z.enum(['queued', 'running', 'completed', 'failed', 'timed_out']), result: z.unknown() })
const outcomeSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('date_found'), expiresOn: z.string().refine(isIsoDate) }),
  z.object({ status: z.literal('date_missing') }),
  z.object({ status: z.literal('date_ambiguous') }),
])

const OFFLINE = 'No se puede conectar con el servidor del hogar. Puedes escribir la caducidad a mano.'
const REFUSED = 'El servidor del hogar no acepta la conexión. Puedes escribir la caducidad a mano.'
const BAD_PHOTO = 'El servidor no admite esta foto. Prueba con otra o escribe la caducidad a mano.'

function problem(status: number): VitaError {
  if (status === 401 || status === 403 || status === 404) return new VitaError(REFUSED)
  return new VitaError(status >= 400 && status < 500 ? BAD_PHOTO : OFFLINE)
}

const aborted = (error: unknown) => error instanceof DOMException && error.name === 'AbortError'
const pause = (ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms) })

/** Envía la foto al servidor del hogar y devuelve la fecha propuesta. No la guarda ni crea avisos allí. */
export async function readExpiry({ file, household, signal, fetch: request = fetch, wait = pause }: ScanOptions): Promise<ScanOutcome> {
  const call = async (path: string, init: RequestInit = {}): Promise<unknown> => {
    let response: Response
    try {
      response = await request(`/api/v1/${path}`, { ...init, signal, headers: { ...init.headers, 'x-vita': '1' } })
    } catch (error) {
      if (aborted(error)) throw error
      throw new VitaError(OFFLINE)
    }
    if (!response.ok) throw problem(response.status)
    try {
      return await response.json()
    } catch (error) {
      if (aborted(error)) throw error
      throw new VitaError(OFFLINE)
    }
  }

  const form = new FormData()
  form.set('householdId', household)
  // El nombre del archivo puede decir de quién es.
  form.set('file', file, file.type === 'image/png' ? 'foto.png' : 'foto.jpg')
  const uploaded = uploadSchema.safeParse(await call('documents', { method: 'POST', body: form }))
  if (!uploaded.success) return { status: 'failed' }

  const accepted = acceptedSchema.safeParse(await call('runs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ householdId: household, documentId: uploaded.data.documentId, message: 'Escanea el documento y propón su fecha de caducidad' }),
  }))
  if (!accepted.success) return { status: 'failed' }

  for (let poll = 0, failures = 0; poll < MAX_POLLS; poll++) {
    signal.throwIfAborted()
    let body: unknown
    try {
      body = await call(`runs/${accepted.data.runId}`)
    } catch (error) {
      if (aborted(error) || ++failures >= MAX_FAILED_POLLS) throw error
      await wait(POLL_MS)
      continue
    }
    const run = runSchema.safeParse(body)
    if (!run.success) return { status: 'failed' }
    if (run.data.status === 'queued' || run.data.status === 'running') {
      await wait(POLL_MS)
      continue
    }
    const outcome = outcomeSchema.safeParse(run.data.result)
    if (run.data.status !== 'completed' || !outcome.success) return { status: 'failed' }
    switch (outcome.data.status) {
      case 'date_found': return { status: 'found', date: outcome.data.expiresOn }
      case 'date_missing': return { status: 'missing' }
      case 'date_ambiguous': return { status: 'ambiguous' }
    }
  }
  return { status: 'failed' }
}
