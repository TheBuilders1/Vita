import * as z from '@/utils/zod'
import { VitaError } from '@/services/errors'
import type { Reply } from './types'

export interface AssistantContextItem {
  readonly title: string
  readonly detail: string
}
export interface ChatAssistantAttachment {
  readonly file: File
  /** Solo se activa tras aceptar que la imagen puede enviarse a Ollama Cloud. */
  readonly analyzeVisually: boolean
}
export interface AssistantOptions {
  readonly message: string
  readonly conversationId: string
  readonly context: readonly AssistantContextItem[]
  readonly attachments?: readonly ChatAssistantAttachment[]
  readonly fetch?: typeof fetch
}

const replySchema = z.object({ message: z.string().trim().min(1).max(8000) })
const attachmentSchema = z.object({ text: z.string().max(12000) })
const visionUploadSchema = z.object({
  visionRefs: z.array(z.string().refine((ref) => /^[A-Za-z0-9_-]{43}$/.test(ref))).min(1).max(3),
  expiresIn: z.number().int().min(1).max(600),
})
const MAX_CONTEXT_ITEMS = 20
const MAX_CONTEXT_DETAIL = 800
export const MAX_CHAT_ATTACHMENTS = 3
export const MAX_CHAT_ATTACHMENT_BYTES = 10 * 1024 * 1024
export const CHAT_ATTACHMENT_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.jpg,.jpeg,.png,.webp,.pdf,.txt,.docx'
const UNAVAILABLE = 'No se pudo conectar con el orquestador. Comprueba que el servidor de Vita esté activo e inténtalo de nuevo.'
const REFUSED = 'El servidor de Vita no acepta esta sesión. Revisa la configuración e inténtalo de nuevo.'
const attachmentTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])
const attachmentExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.txt', '.docx'])
const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp'])

export function isChatImage(file: File): boolean {
  if (imageTypes.has(file.type)) return true
  const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
  return (file.type === '' || file.type === 'application/octet-stream' || file.type === 'application/zip') && imageExtensions.has(extension)
}

export function shouldUseAssistant(reply: Reply, hasAttachments: boolean): boolean {
  if (reply.kind === 'assistant' || reply.kind === 'facts' || reply.kind === 'agenda') return true
  if (!hasAttachments) return false
  if (reply.kind === 'proposals' || reply.kind === 'complete' || reply.kind === 'emergency') return false
  if (reply.kind !== 'text') return false
  return !/^(?:De acuerdo: no apunto nada\.|No cambio ni borro|No puedo dar consejo médico\.)/.test(reply.text)
}

export function validateChatAttachments(files: readonly File[]): string | undefined {
  if (files.length > MAX_CHAT_ATTACHMENTS) return `Adjunta como máximo ${MAX_CHAT_ATTACHMENTS} archivos.`
  for (const file of files) {
    if (file.size > MAX_CHAT_ATTACHMENT_BYTES) return 'Cada archivo debe ocupar como máximo 10 MB.'
    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    const fallbackType = file.type === '' || file.type === 'application/octet-stream' || file.type === 'application/zip'
    if (!attachmentTypes.has(file.type) && !(fallbackType && attachmentExtensions.has(extension))) {
      return 'Adjunta imágenes JPG/PNG/WebP, PDF, TXT o DOCX.'
    }
  }
}

/** Reduce una respuesta local a los datos visibles que el modelo necesita para redactarla. */
export function assistantContext(reply: Reply): AssistantContextItem[] {
  const items = reply.kind === 'facts'
    ? reply.facts.map((fact) => ({
      title: fact.title,
      detail: [fact.text, fact.phone && `Teléfono: ${fact.phone}`].filter(Boolean).join(' · '),
    }))
    : reply.kind === 'agenda'
      ? [...reply.items, ...reply.remaining].map((item) => ({
        title: item.title,
        detail: [item.date, item.endDate && `hasta ${item.endDate}`, item.time, item.label, item.detail].filter(Boolean).join(' · '),
      }))
      : []
  return items.slice(0, MAX_CONTEXT_ITEMS).map((item) => ({
    title: item.title.slice(0, 200),
    detail: item.detail.slice(0, MAX_CONTEXT_DETAIL),
  }))
}

async function extractAttachment(file: File, request: typeof fetch): Promise<string> {
  let response: Response
  try {
    const form = new FormData()
    form.set('file', file, file.name || 'adjunto')
    response = await request('/api/v1/chat/attachments', {
      method: 'POST',
      headers: { 'x-vita': '1' },
      body: form,
    })
  } catch {
    throw new VitaError(UNAVAILABLE)
  }
  if (!response.ok) {
    const message = response.status === 401 || response.status === 403
      ? REFUSED
      : response.status === 413
        ? 'Cada archivo puede ocupar como máximo 10 MB.'
        : response.status === 415
          ? 'Adjunta imágenes JPG/PNG/WebP, PDF, TXT o DOCX.'
          : response.status === 503
            ? 'El lector local no está disponible ahora.'
            : `No se pudo extraer texto de «${file.name}».`
    throw new VitaError(message)
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new VitaError(UNAVAILABLE)
  }
  const reply = attachmentSchema.safeParse(body)
  if (!reply.success) throw new VitaError(UNAVAILABLE)
  return reply.data.text
}

async function stageVisionImages(files: readonly File[], request: typeof fetch): Promise<string[]> {
  const form = new FormData()
  for (const file of files) form.append('files', file, file.name || 'imagen')

  let response: Response
  try {
    response = await request('/api/v1/chat/vision-attachments', {
      method: 'POST',
      headers: { 'x-vita': '1' },
      body: form,
    })
  } catch {
    throw new VitaError(UNAVAILABLE)
  }
  if (!response.ok) {
    const message = response.status === 401 || response.status === 403
      ? REFUSED
      : response.status === 413
        ? 'Cada imagen puede ocupar como máximo 10 MB.'
        : response.status === 415
          ? 'El análisis visual solo admite JPG, PNG o WebP.'
          : response.status === 429
            ? 'Ahora no se pueden analizar más imágenes. Inténtalo de nuevo en unos minutos.'
            : UNAVAILABLE
    throw new VitaError(message)
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new VitaError(UNAVAILABLE)
  }
  const parsed = visionUploadSchema.safeParse(body)
  if (!parsed.success || parsed.data.visionRefs.length !== files.length) throw new VitaError(UNAVAILABLE)
  return parsed.data.visionRefs
}

/** El OCR y la preparación de imágenes ocurren en Vita; Ollama recibe imágenes solo con consentimiento explícito. */
export async function askOrchestrator({ message, conversationId, context, attachments = [], fetch: request = fetch }: AssistantOptions): Promise<string> {
  const files = attachments.map(({ file }) => file)
  const invalid = validateChatAttachments(files)
  if (invalid) throw new VitaError(invalid)
  const extracted: { text: string }[] = []
  const consentedImages: File[] = []
  for (const attachment of attachments) {
    const image = isChatImage(attachment.file)
    const consentPrompt = `No he podido extraer texto de «${attachment.file.name}». Si quieres que analice la imagen con Ollama Cloud, marca antes la casilla de análisis visual.`
    let text = ''
    try {
      text = await extractAttachment(attachment.file, request)
    } catch (error) {
      if (!image) throw error
      if (!attachment.analyzeVisually) throw new VitaError(consentPrompt)
    }
    if (text.trim()) extracted.push({ text: text.trim() })
    if (image && attachment.analyzeVisually) consentedImages.push(attachment.file)
    else if (image && !text.trim()) {
      throw new VitaError(consentPrompt)
    }
  }
  const visionRefs = consentedImages.length
    ? await stageVisionImages(consentedImages, request)
    : []

  let response: Response
  try {
    response = await request('/api/v1/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-vita': '1' },
      body: JSON.stringify({
        message,
        conversationId,
        context,
        attachments: extracted,
        visionRefs,
      }),
    })
  } catch {
    throw new VitaError(UNAVAILABLE)
  }
  if (!response.ok) throw new VitaError(response.status === 401 || response.status === 403 ? REFUSED : UNAVAILABLE)

  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new VitaError(UNAVAILABLE)
  }
  const reply = replySchema.safeParse(body)
  if (!reply.success) throw new VitaError(UNAVAILABLE)
  return reply.data.message
}
