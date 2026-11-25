import { describeError } from '@/services/errors'
import type { AssistantDetails } from '@/store/chatStore'
import { askOrchestrator, assistantContext, shouldUseAssistant } from './assistant'
import { answer, type ChatContext, type Reply } from './index'

interface Result { reply: Reply; details?: AssistantDetails; remote: boolean }
interface Remote { readonly connected: boolean; readonly household: string | null; readonly conversationId: string; readonly attachments?: readonly File[]; readonly signal: AbortSignal }

/** Primero el dispositivo. Solo con servidor y permiso, el asistente del hogar redacta lo que aquí no se entiende o lo que se adjunta. */
export function respond(message: string, context: ChatContext, { connected, household, conversationId, attachments = [], signal }: Remote): Result | Promise<Result> {
  const reply = answer(message, context)
  const details = reply.kind === 'facts' || reply.kind === 'agenda' ? reply : undefined
  if (!connected || !household || !shouldUseAssistant(reply, attachments.length > 0)) return { reply, remote: false }
  return consult()

  async function consult(): Promise<Result> {
    const timer = new AbortController()
    const timeout = setTimeout(() => timer.abort(), 20_000)
    const both = AbortSignal.any([signal, timer.signal])
    try {
      const text = await askOrchestrator({ message, conversationId, context: assistantContext(reply), attachments, fetch: (url, init) => fetch(url, { ...init, signal: both }) })
      return { reply: { kind: 'assistant', text }, details, remote: true }
    } catch (error) {
      // Lo que se sabe en el dispositivo sigue valiendo; si no hay nada, se dice qué ha fallado.
      if (details) return { reply, remote: false }
      return { reply: { kind: 'text', text: `${reply.text} ${timer.signal.aborted ? 'El servidor del hogar ha tardado demasiado.' : describeError(error)}` }, remote: false }
    } finally { clearTimeout(timeout) }
  }
}

export function followUps(reply: Reply): string[] {
  switch (reply.kind) {
    case 'agenda': return ['¿Y mañana?', '¿Y la semana que viene?']
    case 'proposals': return []
    case 'emergency': return ['Teléfonos de emergencia', '¿Qué alergias tengo?']
    case 'facts': return ['¿Qué tengo hoy?', 'Busca el DNI']
    case 'complete': return ['Mis tareas de hoy', '¿Qué tengo mañana?']
    case 'text':
    case 'assistant': return ['¿Qué tengo esta semana?', 'Compra leche y pan']
  }
}
