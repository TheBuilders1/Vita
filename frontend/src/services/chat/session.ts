import * as z from '@/utils/zod'
import { MODULES, RECORD_TYPES, getRecordType } from '@/modules/registry'
import { isIsoDate, isTime } from '@/utils/dates'

const str = z.string()
const strings = z.array(str)
const path = str.regex(/^\/(?!\/)[^\\\s]*$/)
const moduleId = z.enum(MODULES.map(m => m.id))
const date = str.refine(isIsoDate)
const item = z.object({
  key: str, moduleId, date, title: str, sources: strings, memberIds: strings,
  category: z.enum(['event', 'appointment', 'medication', 'school', 'birthday', 'holiday', 'reminder', 'deadline', 'meal']),
  recordId: str.optional(), typeId: str.optional(), endDate: date.optional(), time: str.refine(isTime).optional(),
  label: str.optional(), detail: str.optional(), done: z.boolean().optional(), logStatus: str.optional(),
  routine: z.boolean().optional(), taskPreview: z.boolean().optional(),
})
// Cualquier ficha que exista: desde un archivo se puede proponer cualquiera.
const proposalType = str.refine((id) => RECORD_TYPES.some((type) => type.id === id))
const proposal = z.object({ typeId: proposalType, data: z.record(str, z.unknown()), ready: z.boolean(), notes: strings, missing: strings })
  .transform((p, ctx) => {
    const parsed = getRecordType(p.typeId).schema.safeParse(p.data)
    if (parsed.success) return p
    const absent = parsed.error.issues.map(issue => String(issue.path[0]))
    if (p.ready || absent.some(key => key in p.data || !(key in getRecordType(p.typeId).fields))) {
      ctx.addIssue({ code: 'custom', message: 'La propuesta guardada no es válida' })
      return z.NEVER
    }
    // JSON omite los campos vacíos. El formulario los necesita para no inventar una fecha.
    return { ...p, data: { ...Object.fromEntries(absent.map(key => [key, undefined])), ...p.data } }
  })
const reply = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('text'), text: str, link: z.object({ to: path, label: str }).optional() }),
  z.object({ kind: z.literal('assistant'), text: str }),
  z.object({ kind: z.literal('proposals'), text: str, proposals: z.array(proposal) }),
  z.object({ kind: z.literal('agenda'), text: str, items: z.array(item), remaining: z.array(item),
    scope: z.object({ memberIds: strings, personal: z.boolean(), subject: z.enum(['appointment','task','event','medication']).optional(), moduleId: moduleId.optional() }).optional() }),
  z.object({ kind: z.literal('facts'), text: str, facts: z.array(z.object({ key: str, title: str, text: str,
    recordId: str.optional(), memberId: str.optional(), phone: str.optional(), to: path.optional(), sources: strings.optional(), moduleId: moduleId.optional() })) }),
  z.object({ kind: z.literal('complete'), text: str, choices: z.array(z.object({ recordId: str, updatedAt: str })) }),
  z.object({ kind: z.literal('emergency'), text: str, number: str, helpline: str.optional(), contacts: z.array(z.object({ recordId: str, name: str, phone: str })) }),
])
const card = z.discriminatedUnion('state', [
  z.object({ state: z.literal('saved'), recordId: str, server: z.enum(['saved', 'failed']).optional() }), z.object({ state: z.literal('editing') }), z.object({ state: z.literal('undone') }),
])
export const MAX_TURNS = 50
const details = reply.refine((r): r is Extract<typeof r, { kind: 'agenda' | 'facts' }> => r.kind === 'agenda' || r.kind === 'facts')
export const session = z.object({ actorId: str, conversationId: str.optional(), turns: z.array(z.object({
  id: str, message: str, reply, details: details.optional(), cards: z.record(z.string().regex(/^\d+$/), card), remote: z.boolean().optional(),
})).max(MAX_TURNS) })
