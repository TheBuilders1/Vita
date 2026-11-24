import type { RecordData } from '@/modules/fields'
import { getModule, getRecordType } from '@/modules/registry'
import { canCreate } from '@/services/permissions'
import { subjectsOf } from '@/services/integrity'
import type { FamilyRecord } from '@/types/records'
import { ambiguousNames, mentioned, withoutPerson } from './people'
import type { ChatContext, Proposal, Reply } from './types'
import { findDate, findRepeat, findTime, plain, without, type Phrase } from './when'

const DENTAL = /\b(dentista|dental|ortodon\w*|muela|empaste|caries|limpieza bucal)/
const MEDICAL = /\b(medic[oa]s?|pediatra|doctora?|hospital|ambulatorio|analisis|analitica|vacuna\w*|cita medica|consulta|matrona|oculista|oftalmolog\w*|fisio\w*|dermatolog\w*|ginecolog\w*|cardiolog\w*|psicolog\w*|enfermer\w*|revision medica)/
const EVENT = /\b(evento|reunion|fiesta|cumple\w*|cena|comida|almuerzo|excursion|viaje|quedada|partido|concierto|boda|tutoria|visita)/
const SHOPPING_LIST = /\b(?:a|en|para) (?:la )?(?:lista de (?:la )?)?compra\b|\ba la lista\b/
const BUY = /^(?:comprar?|falta[n]?)\b/
const MAX_ITEMS = 20

const start = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)
/** Lo que queda al quitar fecha, hora y persona suele acabar en una preposición suelta. */
function title({ raw }: Phrase): string {
  let text = raw.replace(/^[\s,.;:¿?¡!]+|[\s,.;:¿?¡!]+$/g, '')
  for (let before = ''; before !== text;) {
    before = text
    text = text.replace(/^(?:una?|de|del|que|para|con)\s+/i, '').replace(/\s+(?:el|la|a|de|del|para|con|en|y|por)$/i, '').replace(/[\s,.;:]+$/, '')
  }
  return start(text)
}

function build(typeId: string, data: RecordData, notes: readonly string[], blocked = false): Proposal {
  const type = getRecordType(typeId)
  const parsed = type.schema.safeParse(data)
  const names = [...new Set((parsed.error?.issues ?? []).map((i) => String(i.path[0])))]
  // Vacío a propósito: el formulario pondría la fecha de hoy y parecería elegida.
  const preset = { ...Object.fromEntries(names.filter((n) => !(n in data)).map((n) => [n, undefined])), ...data }
  return { typeId, data: preset, ready: parsed.success && !blocked, missing: names.map((n) => type.fields[n]?.label ?? n), notes }
}

/** Motivo por el que este perfil no puede añadir algo así, o nada. */
function refusal({ actor, enabled }: ChatContext, typeId: string, data: RecordData): Reply | undefined {
  const type = getRecordType(typeId)
  const module = getModule(type.moduleId)
  if (!enabled.includes(module.id)) return { kind: 'text', text: `La habitación «${module.name}» está cerrada en vuestro hogar.`, link: { to: '/ajustes#habitaciones', label: 'Elegir habitaciones' } }
  if (!canCreate(actor, typeId, subjectsOf(typeId, data))) return { kind: 'text', text: `Tu perfil no puede añadir aquí: ${type.name.toLowerCase()}. Pídeselo a quien administra el hogar.` }
  return undefined
}

const UNITS = 'litros?|l|kilos?|kg|gramos?|g|paquetes?|botes?|cajas?|barras?|botellas?|latas?|docenas?|bolsas?|unidades?'
const COUNT: Readonly<Record<string, number>> = { un: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, doce: 12, medio: 0.5, media: 0.5 }
const ITEM = new RegExp(`^(?:(\\d+(?:[.,]\\d+)?|${Object.keys(COUNT).join('|')})\\s+(?:(${UNITS})\\s+(?:de\\s+)?)?)?(.+)$`, 'i')

function item(text: string): RecordData | undefined {
  const match = ITEM.exec(text.trim().replace(/^(?:el|la|los|las|de|mas)\s+/i, ''))
  const name = match?.[3]?.trim()
  if (!match || !name) return undefined
  const amount = match[1] === undefined ? undefined : (COUNT[match[1].toLowerCase()] ?? Number(match[1].replace(',', '.')))
  return { name: start(name), ...(amount !== undefined && { quantity: amount }), ...(match[2] ? { unit: match[2].toLowerCase() } : {}) }
}

function shopping(text: Phrase, context: ChatContext): Reply {
  const lists = context.records.filter((r) => r.typeId === 'shoppingList')
  const refused = refusal(context, 'shoppingItem', {})
  if (refused) return refused
  if (lists.length === 0) return { kind: 'proposals', text: 'Todavía no hay ninguna lista. ¿Creo esta? Después vuelve a pedírmelo.', proposals: [build('shoppingList', { name: 'Compra de casa' }, [])] }
  const named = lists.filter((l) => text.plain.includes(plain(String(l.data.name))))
  const list: FamilyRecord | undefined = named.length === 1 ? named[0] : lists.length === 1 ? lists[0] : undefined
  let rest = without(without(text, SHOPPING_LIST), BUY)
  if (named.length === 1) rest = without(rest, new RegExp(`(?:\\b(?:a|en|para) )?(?:la )?(?:lista )?(?:de )?${plain(String(named[0]!.data.name)).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`))
  const items = rest.raw.split(/\s*(?:(?<!\d),|,(?!\d))\s*|\s+y\s+/).map((t) => item(t.replace(/[.;:!?¿¡]+$/, ''))).filter((i) => i !== undefined).slice(0, MAX_ITEMS)
  if (items.length === 0) return { kind: 'text', text: '¿Qué hay que comprar? Por ejemplo: «compra leche y pan».' }
  const proposals = items.map((data) => build('shoppingItem', { ...(list && { list: list.id }), ...data }, []))
  return { kind: 'proposals', text: proposals.length === 1 ? 'Voy a añadir esto a la compra:' : `Voy a añadir estas ${proposals.length} cosas a la compra:`, proposals }
}

const DENTAL_KIND: readonly (readonly [RegExp, string])[] = [[/limpieza/, 'cleaning'], [/ortodon/, 'orthodontics'], [/empaste|caries|muela/, 'treatment']]

function repeatingTask(schedule: NonNullable<ReturnType<typeof findRepeat>>, context: ChatContext): Reply {
  const { repeat, text } = schedule
  const clock = findTime(text)
  const when = findDate(clock.text, context.today)
  const others = mentioned(when.text.plain, context.members)
  const ambiguous = ambiguousNames(others)
  let rest = without(when.text, /^tarea\b:?/)
  for (const person of others) rest = withoutPerson(rest, person, 'para')
  const name = title(without(rest, /\bpara mi\b/))
  const extra = findDate(rest, context.today)
  const multipleDays = repeat === 'monthly' && /\bdia \d{1,2}(?:,| y| o) ?\d{1,2}\b/.test(text.plain)
  if (multipleDays || findRepeat(rest) || extra.value || extra.problem || findTime(rest).value || /\b(?:hasta|entre semana|quincena|y (?:los )?(?:lunes|martes|miercoles|jueves|viernes|sabado|domingo))\b/.test(rest.plain)) {
    return { kind: 'text', text: '¿Qué día y a qué hora se repite? Dime una sola pauta, por ejemplo «cada lunes a las 9».' }
  }
  if (!name) return { kind: 'text', text: '¿Qué tarea quieres que se repita?' }
  const dueDate = when.value ?? (repeat === 'daily' && !when.problem ? context.today : undefined)
  const notes = [
    when.problem, clock.problem ? (clock.value ? '¿La hora es de la mañana o de la tarde? Revísala en el formulario.' : clock.problem) : undefined, ...ambiguous.map((person) => `Hay más de una persona que se llama ${person}: elige cuál.`),
    dueDate === undefined && !when.problem ? '¿Qué día quieres que empiece?' : undefined,
  ].filter((note) => note !== undefined)
  const data: RecordData = {
    title: name, members: others.filter((person) => !ambiguous.includes(person.name)).map((person) => person.id),
    repeat, dueDate, ...(clock.value && !clock.problem && { time: clock.value }),
  }
  const refused = refusal(context, 'task', data)
  return refused ?? { kind: 'proposals', text: 'Revisa esta tarea que se repite.', proposals: [build('task', data, notes, notes.length > 0)] }
}

export function propose(text: Phrase, context: ChatContext, selfish: boolean): Reply {
  const schedule = findRepeat(text)
  if (schedule) return repeatingTask(schedule, context)
  if (/\b(?:cada|todos los|todas las) (?:dos|tres|\d+|semanas|meses|años)\b/.test(text.plain)) {
    return { kind: 'text', text: '¿Cómo se repite? Prueba con «cada día», «cada lunes» o «cada mes el día 5».' }
  }
  const when = findDate(text, context.today)
  const clock = findTime(when.text)
  const dated = when.value !== undefined || when.problem !== undefined || clock.value !== undefined
  if (SHOPPING_LIST.test(text.plain) || (BUY.test(text.plain) && !dated)) return shopping(text, context)

  const found = mentioned(clock.text.plain, context.members)
  const ambiguous = ambiguousNames(found)
  const people = found.filter((m) => !ambiguous.includes(m.name))
  const notes = [when.problem, clock.problem, ...ambiguous.map((name) => `Hay más de una persona que se llama ${name}: elige cuál.`)].filter((n) => n !== undefined)
  const blocked = ambiguous.length > 0 || (when.problem !== undefined && when.value === undefined) || (clock.problem !== undefined && clock.value === undefined)
  const date = when.value
  const time = clock.value
  let rest = clock.text

  const dental = DENTAL.test(rest.plain)
  if (dental || MEDICAL.test(rest.plain)) {
    const typeId = dental ? 'dentalVisit' : 'appointment'
    const self = /\bpara mi\b/.test(rest.plain) || (selfish && found.length === 0)
    rest = without(rest, /\bpara mi\b/)
    for (const m of found) rest = withoutPerson(rest, m, 'para|de|a|con')
    const member = self ? context.actor.id : people.length === 1 ? people[0]!.id : undefined
    const kind = DENTAL_KIND.find(([pattern]) => pattern.test(rest.plain))?.[1] ?? 'checkup'
    const data: RecordData = { title: title(rest), ...(member && { member }), ...(date && { date }), ...(time && { time }), ...(dental && { kind }) }
    const refused = refusal(context, typeId, data)
    return refused ?? { kind: 'proposals', text: 'Voy a apuntar esto:', proposals: [build(typeId, data, notes, blocked)] }
  }

  const event = /^evento\b/.test(rest.plain) || (!/^tarea\b/.test(rest.plain) && (date ?? when.problem) !== undefined && (time !== undefined || EVENT.test(rest.plain)))
  rest = without(rest, /^(?:tarea|evento|recordatorio|cita)\b:?(?! (?:con|en)\b)/)
  for (const m of found) rest = withoutPerson(rest, m, 'para')
  const name = title(without(rest, /\bpara mi\b/))
  if (!name) return { kind: 'text', text: '¿Qué quieres que apunte? Por ejemplo: «apunta dentista para el martes a las 10».' }
  const typeId = event ? 'event' : 'task'
  const data: RecordData = { title: name, members: people.map((m) => m.id), ...(event ? date && { date } : date && { dueDate: date }), ...(time && { time }) }
  const refused = refusal(context, typeId, data)
  return refused ?? { kind: 'proposals', text: 'Voy a apuntar esto:', proposals: [build(typeId, data, notes, blocked)] }
}
