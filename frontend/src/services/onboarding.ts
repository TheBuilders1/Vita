import * as z from '@/utils/zod'
import type { ModuleId } from '@/modules/types'
import { familyInputSchema, memberInputSchema, moduleIdSchema, NEEDS, ROLES, type FamilyInput, type MemberInput, type Need, type Role } from '@/types/family'
import { ageOn } from '@/utils/dates'

export const STEPS = [
  { id: 'name', title: '¿Cómo se llama vuestro hogar?' },
  { id: 'you', title: '¿Quién eres?' },
  { id: 'count', title: '¿Cuántas personas sois?' },
  { id: 'members', title: '¿Con quién compartes el hogar?' },
  { id: 'roles', title: '¿Quién es responsable y quién forma parte del hogar?' },
  { id: 'ages', title: '¿Cuándo nació cada persona?' },
  { id: 'needs', title: '¿Hay algo que debamos tener en cuenta?' },
  { id: 'modules', title: 'Las habitaciones de vuestra casa' },
  { id: 'look', title: '¿Cómo prefieres leer la pantalla?' },
] as const
export type StepId = (typeof STEPS)[number]['id']

/** Sin esto no hay hogar. Lo demás se puede completar ahora o más adelante. */
const ESSENTIAL: ReadonlySet<StepId> = new Set(['name', 'you'])
const FOR_OTHERS: ReadonlySet<StepId> = new Set(['members', 'ages', 'roles'])

export interface DraftMember { name: string; relationship: string; birthDate: string; role: Role; needs: Need[] }
export interface Draft {
  name: string
  members: DraftMember[]
  hasPets: boolean
  /** null: todavía valen las sugerencias. */
  modules: ModuleId[] | null
  /** Ha elegido completar también los pasos opcionales. */
  detailed: boolean
  /** Vive solo o sola: sobran los pasos de las demás personas. */
  alone: boolean
}

const MAX_MEMBERS = 12

export function resizeMembers(members: readonly DraftMember[], count: number): DraftMember[] {
  const size = Math.min(MAX_MEMBERS, Math.max(1, Math.trunc(count) || 1))
  return Array.from({ length: size }, (_, i) => members[i] ?? { name: '', relationship: '', birthDate: '', role: i === 0 ? 'master' : 'member', needs: [] })
}

export const EMPTY_DRAFT: Draft = { name: '', members: resizeMembers([], 1), hasPets: false, modules: null, detailed: false, alone: false }

const draftSchema = z.object({
  name: z.string(),
  members: z.array(z.object({ name: z.string(), relationship: z.string(), birthDate: z.string(), role: z.enum(ROLES), needs: z.array(z.enum(NEEDS)) })).min(1).max(MAX_MEMBERS),
  hasPets: z.boolean().default(false),
  modules: z.array(moduleIdSchema).nullable().default(null),
  detailed: z.boolean().default(false),
  alone: z.boolean().default(false),
})

/** Lo guardado puede venir de otra versión o estar estropeado: ante la duda, se empieza de cero. */
export function restoreDraft(raw: string | null): Draft {
  try {
    const parsed = draftSchema.safeParse(JSON.parse(raw ?? 'null'))
    return parsed.success ? parsed.data : EMPTY_DRAFT
  } catch {
    return EMPTY_DRAFT
  }
}

export const hasProgress = (draft: Draft): boolean => [draft.name, ...draft.members.flatMap((m) => [m.name, m.relationship, m.birthDate])].some((text) => text.trim() !== '')

export function visibleSteps(draft: Draft): readonly (typeof STEPS)[number][] {
  return STEPS.filter(({ id }) => ESSENTIAL.has(id) || (draft.detailed && !(draft.alone && id === 'count') && ((!draft.alone && draft.members.length > 1) || !FOR_OTHERS.has(id))))
}

const isUntouched = (m: DraftMember) => m.needs.length === 0 && [m.name, m.relationship, m.birthDate].every((text) => text.trim() === '')

/** Lo que se va a guardar: sin las personas añadidas y no escritas, y quien vive solo administra su hogar. */
function settle(draft: Draft): Draft {
  const members = draft.members.filter((m, i) => i === 0 || !isUntouched(m))
  return { ...draft, members: members.length === 1 ? members.map((m) => ({ ...m, role: 'master' as const })) : members }
}

/** Primer paso que impide crear el hogar; `null` si ya se puede entrar. */
export function firstInvalidStep(draft: Draft, today: string): StepId | null {
  const ready = settle(draft)
  return STEPS.find(({ id }) => Object.keys(validateStep(ready, id, today)).length > 0)?.id ?? null
}

/** Paso que se puede enseñar de verdad: no se salta nada sin completar ni se vuelve a uno que ya no toca. */
export function resolveStep(draft: Draft, requested: string | null, today: string): StepId {
  const steps = visibleSteps(draft)
  const index = steps.findIndex((s) => s.id === requested)
  if (index < 0) return 'name'
  return steps.slice(0, index).find((s) => Object.keys(validateStep(draft, s.id, today)).length > 0)?.id ?? steps[index]!.id
}

export type StepErrors = Record<string, string>

const MEMBER_FIELDS: Partial<Record<StepId, readonly string[]>> = { you: ['name', 'relationship', 'birthDate'], members: ['name', 'relationship'], ages: ['birthDate'] }

export function validateStep(draft: Draft, step: StepId, today: string): StepErrors {
  if (step === 'name') {
    const parsed = familyInputSchema.safeParse({ name: draft.name, enabledModules: [] })
    return parsed.success ? {} : { name: parsed.error.issues[0]!.message }
  }
  if (step === 'roles') {
    return draft.members.some((m) => m.role === 'master') ? {} : { roles: 'Elige al menos un admin: es quien administra el hogar' }
  }
  const errors: StepErrors = {}
  const fields = MEMBER_FIELDS[step] ?? []
  draft.members.forEach((member, i) => {
    // La primera persona es quien crea el hogar y tiene su propio paso.
    if ((step === 'you') !== (i === 0)) return
    for (const issue of memberInputSchema(today).safeParse(member).error?.issues ?? []) {
      const field = String(issue.path[0])
      if (fields.includes(field)) errors[`members.${i}.${field}`] ??= issue.message
    }
  })
  return errors
}

const FOR_EVERYONE: readonly ModuleId[] = [
  'planner', 'cooking', 'fridge', 'healthRecord', 'dental', 'medication', 'vaccination', 'emergency',
  'finances', 'savings', 'documents', 'outings', 'shopping', 'technology', 'cybersecurity', 'digitalInfo', 'album',
]

/** Habitaciones recomendadas y, cuando dependen de las respuestas, el porqué. */
export function suggestModules(draft: { members: readonly Pick<DraftMember, 'birthDate' | 'needs' | 'role'>[]; hasPets: boolean }, today: string): Map<ModuleId, string> {
  const suggestions = new Map<ModuleId, string>(FOR_EVERYONE.map((id) => [id, '']))
  const ages = draft.members.filter((m) => m.birthDate).map((m) => ageOn(m.birthDate, today))
  const needs = new Set(draft.members.flatMap((m) => m.needs))
  const suggest = (condition: boolean, reason: string, ...ids: ModuleId[]) => { if (condition) for (const id of ids) suggestions.set(id, reason) }

  suggest(ages.some((a) => a >= 3 && a < 18), 'Porque hay menores en edad escolar', 'school', 'grants', 'bookings')
  suggest(ages.some((a) => a < 13) || needs.has('newParent'), 'Porque hay niños pequeños o esperáis uno', 'development')
  suggest(ages.some((a) => a >= 5 && a < 18), 'Porque hay menores que pueden tener paga', 'kidsMoney')
  suggest(draft.hasPets, 'Porque tenéis mascotas', 'pets')
  suggest(needs.has('dependency') || needs.has('disability') || draft.members.some((m) => m.role === 'vulnerable'), 'Porque alguien necesita cuidados', 'care')
  suggest(needs.has('allergy') || needs.has('intolerance'), 'Porque hay alergias o intolerancias', 'diet')
  return suggestions
}

export function toSetup(draft: Draft, today: string): { family: FamilyInput; members: MemberInput[] } {
  const ready = settle(draft)
  return {
    family: { name: ready.name, enabledModules: ready.modules ?? [...suggestModules(ready, today).keys()] },
    members: ready.members,
  }
}
