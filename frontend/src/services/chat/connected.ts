import { getRecordType } from '@/modules/registry'
import * as z from '@/utils/zod'
import type { Turn } from '@/store/chatStore'
import { answer, UNKNOWN, type ChatContext, type Reply } from './index'

export const proposalType = z.enum(['task', 'event', 'appointment', 'dentalVisit', 'shoppingItem', 'shoppingList'])
const plainText = z.string().trim().min(1).max(2000).refine(value => !/<\/?[a-z][^>]*>/i.test(value))
const proposal = z.strictObject({ typeId: proposalType, data: z.record(z.string(), z.unknown()) }).transform(({ typeId, data }, ctx) => {
  const parsed = getRecordType(typeId).schema.safeParse(data)
  if (!parsed.success) {
    ctx.addIssue({ code: 'custom', message: 'La propuesta está incompleta' })
    return z.NEVER
  }
  return { typeId, data: parsed.data, ready: true, missing: [], notes: [] }
})
const envelope = z.strictObject({ reply: z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('text'), text: plainText }),
  z.strictObject({ kind: z.literal('proposals'), text: plainText, proposals: z.array(proposal).min(1).max(20) }),
]) })
interface Result { reply: Reply; remote: boolean }

const person = ({ id, name }: ChatContext['actor']) => ({ id, name })

export function respond(message: string, context: ChatContext, turns: readonly Turn[], connected: boolean, household: string | null, signal: AbortSignal): Result | Promise<Result> {
  const reply = answer(message, context)
  if (reply.kind !== 'text' || reply.text !== UNKNOWN || !connected || !household) return { reply, remote: false }

  const payload = {
    message, today: context.today, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    actor: person(context.actor), members: context.members.map(person), origin: context.origin ?? null,
    history: turns.filter(t => t.remote).slice(-6).map(t => ({ message: t.message, reply: t.reply.text })),
  }
  return consult()

  async function consult(): Promise<Result> {
    const timer = new AbortController()
    const timeout = setTimeout(() => timer.abort(), 20_000)
    try {
      const response = await fetch('/api/v1/chat', {
        method: 'POST', headers: { 'x-vita': '1', 'content-type': 'application/json' },
        body: JSON.stringify(payload), signal: AbortSignal.any([signal, timer.signal]),
      })
      if (response.ok) {
        const parsed = envelope.safeParse(await response.json())
        if (parsed.success) return { reply: parsed.data.reply, remote: true }
      }
    } catch {
      // Sin conexión, con una respuesta ilegible o al agotarse el tiempo se conserva la ayuda local.
    } finally { clearTimeout(timeout) }
    return { reply: { kind: 'text', text: `${reply.text} No he podido consultar al asistente del servidor.` }, remote: false }
  }
}

export function followUps(reply: Reply): string[] {
  switch (reply.kind) {
    case 'agenda': return ['¿Y mañana?', '¿Y la semana que viene?']
    case 'proposals': return []
    case 'emergency': return ['Teléfonos de emergencia', '¿Qué alergias tengo?']
    case 'facts': return ['¿Qué tengo hoy?', 'Busca el DNI']
    case 'complete': return ['Mis tareas de hoy', '¿Qué tengo mañana?']
    case 'text': return ['¿Qué tengo esta semana?', 'Compra leche y pan']
  }
}
