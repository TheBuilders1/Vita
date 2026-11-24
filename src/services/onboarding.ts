import type { ModuleId } from '@/modules/types'
import { familyInputSchema, memberInputSchema, type FamilyInput, type MemberInput, type Need, type Role } from '@/types/family'
import { ageOn } from '@/utils/dates'

export const STEPS = [
  { id: 'name', title: '¿Cómo se llama vuestra familia?' },
  { id: 'count', title: '¿Cuántas personas sois?' },
  { id: 'members', title: '¿Quiénes sois?' },
  { id: 'ages', title: '¿Cuándo nació cada persona?' },
  { id: 'roles', title: '¿Qué puede hacer cada persona?' },
  { id: 'needs', title: '¿Hay algo que debamos tener en cuenta?' },
  { id: 'modules', title: 'Las habitaciones de vuestra casa' },
  { id: 'look', title: '¿Cómo prefieres leer la pantalla?' },
] as const
export type StepId = (typeof STEPS)[number]['id']

export interface DraftMember { name: string; relationship: string; birthDate: string; role: Role; needs: Need[] }
export interface Draft {
  name: string
  members: DraftMember[]
  hasPets: boolean
  /** null: todavía valen las sugerencias. */
  modules: ModuleId[] | null
}

const MAX_MEMBERS = 12

export function resizeMembers(members: readonly DraftMember[], count: number): DraftMember[] {
  const size = Math.min(MAX_MEMBERS, Math.max(1, Math.trunc(count) || 1))
  return Array.from({ length: size }, (_, i) => members[i] ?? { name: '', relationship: '', birthDate: '', role: i === 0 ? 'master' : 'member', needs: [] })
}

export const EMPTY_DRAFT: Draft = { name: '', members: resizeMembers([], 2), hasPets: false, modules: null }

export type StepErrors = Record<string, string>

const MEMBER_FIELDS: Partial<Record<StepId, readonly string[]>> = { members: ['name', 'relationship'], ages: ['birthDate'] }

export function validateStep(draft: Draft, step: StepId, today: string): StepErrors {
  if (step === 'name') {
    const parsed = familyInputSchema.safeParse({ name: draft.name, enabledModules: [] })
    return parsed.success ? {} : { name: parsed.error.issues[0]!.message }
  }
  if (step === 'roles') {
    return draft.members.some((m) => m.role === 'master') ? {} : { roles: 'Elige al menos un máster: es quien administra la familia' }
  }
  const errors: StepErrors = {}
  const fields = MEMBER_FIELDS[step] ?? []
  draft.members.forEach((member, i) => {
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
export function suggestModules(draft: Draft, today: string): Map<ModuleId, string> {
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
  return {
    family: { name: draft.name, enabledModules: draft.modules ?? [...suggestModules(draft, today).keys()] },
    members: draft.members,
  }
}
