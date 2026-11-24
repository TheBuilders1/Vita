import { getModule } from '@/modules/registry'
import type { ModuleId } from '@/modules/types'
import type { Member } from '@/types/family'
import type { FamilyRecord } from '@/types/records'
import { addDays, ageOn, diffDays } from '@/utils/dates'
import { buildAgenda } from './agenda'
import { budgetAmounts, budgetWarning, categoryName, monthSummary } from './finance'
import { suggestModules } from './onboarding'
import { hasSevere, rankRecipes } from './recipes'
import { recordTitle, titleContext } from './titles'

/** health y finance se muestran siempre como orientación, nunca como consejo profesional. */
export interface Tip {
  readonly id: string
  readonly moduleId: ModuleId
  readonly kind: 'general' | 'health' | 'finance'
  readonly title: string
  readonly text: string
  readonly link?: string
}

export interface TipQuery {
  readonly records: readonly FamilyRecord[]
  readonly members: readonly Member[]
  readonly today: string
  readonly enabled: readonly ModuleId[]
  readonly lastBackup: string | null
  readonly dismissed: readonly string[]
}

type Draft = Omit<Tip, 'kind'>
type Rule = (query: TipQuery) => Draft[]

const ofType = (records: readonly FamilyRecord[], typeId: string) => records.filter((r) => r.typeId === typeId)
const within = (today: string, date: unknown, days: number) => typeof date === 'string' && date >= today && diffDays(today, date) <= days

/** El identificador incluye el periodo para que un consejo descartado pueda volver más adelante. */
const RULES: readonly Rule[] = [
  function missingRooms({ members, today, enabled }) {
    // Solo lo que depende de las personas: lo general puede estar cerrado a propósito.
    const missing = [...suggestModules({ members, hasPets: false }, today)].filter(([id, reason]) => reason !== '' && !enabled.includes(id))
    if (missing.length === 0) return []
    const reasons = [...new Set(missing.map(([, reason]) => reason))].join('. ')
    return [{
      id: `rooms:${missing.map(([id]) => id).toSorted().join()}`, moduleId: 'planner', title: 'Hay habitaciones que os pueden servir',
      text: `${missing.map(([id]) => getModule(id).name).join(', ')}. ${reasons}.`, link: '/ajustes#habitaciones',
    }]
  },
  function emergencyContacts({ records }) {
    if (ofType(records, 'emergencyContact').length > 0) return []
    return [{ id: 'contacts', moduleId: 'emergency', title: 'Prepara los contactos de emergencia', text: 'Añade a una o dos personas de confianza. Si pasa algo, estarán a un toque.' }]
  },
  function emergencyCards({ records, members }) {
    const covered = new Set(ofType(records, 'emergencyCard').map((c) => c.data.member))
    return members
      .filter((m) => (m.role === 'vulnerable' || m.needs.includes('dependency')) && !covered.has(m.id))
      .map((m) => ({ id: `card:${m.id}`, moduleId: 'emergency', title: `Haz la ficha de emergencia de ${m.name}`, text: 'Alergias, medicación y médico de referencia en un solo sitio para quien tenga que atenderle.' }))
  },
  function forgottenDoses({ records, today }) {
    const yesterday = addDays(today, -1)
    const missed = buildAgenda({ records: records.filter((r) => r.moduleId === 'medication'), members: [], from: yesterday, to: yesterday }).filter((i) => i.done === false)
    return [...new Map(missed.map((i) => [i.recordId, i])).values()].map((i) => ({
      id: `dose:${i.recordId}:${yesterday}`, moduleId: 'medication', title: `Ayer quedó sin anotar: ${i.title}`,
      text: 'Si se tomó, anótalo. Si no, no dobles la dosis por tu cuenta: consulta con un profesional.',
    }))
  },
  function dentalCheckups({ records, members, today }) {
    const visits = ofType(records, 'dentalVisit')
    const covered = (m: Member) => visits.some(({ data }) => data.member === m.id && (String(data.date) >= today || String(data.date) >= addDays(today, -365)))
    return members
      .filter((m) => { const age = ageOn(m.birthDate, today); return age >= 2 && age < 18 && !covered(m) })
      .map((m) => ({ id: `dental:${m.id}:${today.slice(0, 7)}`, moduleId: 'dental', title: 'Revisión dental', text: `No hay ninguna revisión dental de ${m.name} en el último año ni prevista. Pregunta en vuestra clínica cuándo le toca.` }))
  },
  function expiringDocuments({ records, today }) {
    return ofType(records, 'document').filter((d) => within(today, d.data.expiryDate, 60)).map((d) => ({
      id: `document:${d.id}:${String(d.data.expiryDate)}`, moduleId: 'documents', title: `${String(d.data.title)} caduca pronto`,
      text: `Quedan ${diffDays(today, String(d.data.expiryDate))} días. Algunas renovaciones necesitan cita previa.`,
    }))
  },
  function useItUp({ records, today }) {
    const expiring = ofType(records, 'foodItem').filter((f) => within(today, f.data.expiryDate, 3))
    if (expiring.length === 0) return []
    const best = rankRecipes(ofType(records, 'recipe'), expiring.map((f) => String(f.data.name)), ofType(records, 'dietNeed')).find((m) => m.have.length > 0 && !hasSevere(m))
    if (!best) return []
    return [{ id: `recipe:${best.recipe.id}:${today}`, moduleId: 'fridge', title: `Aprovecha lo que caduca: ${String(best.recipe.data.title)}`, text: `Usa ${best.have.join(', ').toLowerCase()}. No choca con las alergias e intolerancias registradas, pero revisa siempre las etiquetas.` }]
  },
  function tightBudgets({ records, today }) {
    return monthSummary(records, today).categories.flatMap((item) => {
      const { category, spent, limit } = item
      const warning = budgetWarning(item)
      if (!warning || limit === undefined) return []
      const level = spent > limit ? 'over' : 'near'
      return [{
        id: `budget:${category}:${today.slice(0, 7)}:${level}`, moduleId: 'finances' as const,
        title: warning, text: `${categoryName(category)}. Este mes lleváis ${budgetAmounts(spent, limit)}.`,
      }]
    })
  },
  function schoolTomorrow({ records, today }) {
    const tomorrow = addDays(today, 1)
    const context = titleContext([], records)
    return buildAgenda({ records: records.filter((r) => r.moduleId === 'school'), members: [], from: tomorrow, to: tomorrow }).map((i) => {
      const record = context.records.get(i.recordId!)!
      return { id: `school:${i.key}`, moduleId: 'school', title: `Mañana: ${recordTitle(record, context)}`, text: 'Dejad hoy preparado lo que haga falta.' }
    })
  },
  function newParents({ members, today }) {
    const baby = members.some((m) => ageOn(m.birthDate, today) < 3)
    if (!baby && !members.some((m) => m.needs.includes('newParent'))) return []
    return [{ id: 'newParent', moduleId: 'development', title: 'Los primeros meses, paso a paso', text: 'En Desarrollo infantil tenéis orientación general para empezar. Cada bebé lleva su ritmo: las dudas, a su pediatra.' }]
  },
  function childDevices({ records, members, today }) {
    const minors = new Set(members.filter((m) => ageOn(m.birthDate, today) < 14).map((m) => m.id))
    return ofType(records, 'device').filter((d) => minors.has(String(d.data.member)) && !d.data.parentalControl).map((d) => ({
      id: `device:${d.id}`, moduleId: 'technology', title: `${String(d.data.name)}: sin control parental`, text: 'Hablad de las normas de uso y valorad activarlo en los ajustes del dispositivo.',
    }))
  },
  function staleBackup({ records, lastBackup, today }) {
    if (records.length === 0 || (lastBackup && diffDays(lastBackup, today) <= 30)) return []
    return [{ id: `backup:${today.slice(0, 7)}`, moduleId: 'planner', title: 'Guarda una copia de seguridad', text: 'Vuestros datos solo están en este navegador. Una copia evita perderlos.', link: '/ajustes#copias' }]
  },
]

export function buildTips(query: TipQuery): Tip[] {
  return RULES.flatMap((rule) => rule(query))
    .filter((tip) => query.enabled.includes(tip.moduleId) && !query.dismissed.includes(tip.id))
    .map((tip) => ({ ...tip, kind: getModule(tip.moduleId).disclaimer ?? 'general' }))
}
