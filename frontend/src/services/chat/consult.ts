import { getRecordType } from '@/modules/registry'
import { buildAgenda } from '@/services/agenda'
import { fieldText, recordTitle, titleContext } from '@/services/titles'
import { moduleLink } from '@/utils/links'
import type { Member } from '@/types/family'
import type { FamilyRecord } from '@/types/records'
import { addDays, addMonths, ageOn, diffDays, startOfWeek, weekdayOf } from '@/utils/dates'
import { formatDate, formatDay } from '@/utils/format'
import { ambiguousNames, mentioned } from './people'
import type { AgendaMatch, ChatContext, Fact, Reply } from './types'
import { recordSources } from './visibility'
import { findDate, plain } from './when'

const MAX_ROWS = 12
const NOT_FOUND = 'No encuentro nada así entre lo que puede ver tu perfil.'

const visible = ({ records, enabled }: ChatContext) => records.filter((r) => enabled.includes(r.moduleId))
const ofType = (context: ChatContext, ...types: string[]) => visible(context).filter((r) => types.includes(r.typeId))

function range(text: string, today: string): { from: string; to: string; label: string } | undefined {
  const monday = startOfWeek(today)
  if (/fin de semana|finde/.test(text)) return { from: today > addDays(monday, 5) ? today : addDays(monday, 5), to: addDays(monday, 6), label: 'el fin de semana' }
  if (/(semana que viene|proxima semana)/.test(text)) return { from: addDays(monday, 7), to: addDays(monday, 13), label: 'la semana que viene' }
  if (/semana/.test(text)) return { from: today, to: addDays(today, 7 - weekdayOf(today)), label: 'lo que queda de semana' }
  if (/(mes que viene|proximo mes)/.test(text)) { const from = addMonths(`${today.slice(0, 7)}-01`, 1); return { from, to: addDays(addMonths(from, 1), -1), label: 'el mes que viene' } }
  if (/\beste mes\b/.test(text)) return { from: today, to: addDays(addMonths(`${today.slice(0, 7)}-01`, 1), -1), label: 'lo que queda de mes' }
  const found = findDate({ plain: text, raw: text }, today)
  if (found.problem) return undefined
  const date = found.value ?? today
  return { from: date, to: date, label: date === today ? 'hoy' : formatDay(date).toLowerCase() }
}

export function agenda(text: string, context: ChatContext): Reply {
  const period = range(text, context.today)
  if (!period) return { kind: 'text', text: '¿Qué fecha quieres ver? Por ejemplo «¿qué tengo mañana?»' }
  const { from, to, label } = period
  const found = mentioned(text, context.members)
  if (ambiguousNames(found).length > 0) return { kind: 'text', text: 'Hay más de una persona con ese nombre. ¿De quién quieres ver la agenda?' }
  const people = found.map((m) => m.id)
  const mine = /\b(tengo|mis?|me)\b/.test(text)
  const titles = titleContext(context.members, context.records)
  const items = buildAgenda({ records: visible(context), members: context.enabled.includes('planner') ? context.members : [], from, to, today: context.today }).filter(({ memberIds }) => {
    if (people.length > 0) return memberIds.some((id) => people.includes(id))
    return !mine || memberIds.length === 0 || memberIds.includes(context.actor.id)
  }).map((item): AgendaMatch => {
    const record = item.recordId === undefined ? undefined : titles.records.get(item.recordId)
    if (!record) return { ...item, sources: [] }
    const entry = getRecordType(record.typeId).agenda?.find((candidate, index) => (
      `${record.id}:${index}:${item.date}:${item.time ?? ''}` === item.key && candidate.category === item.category
    ))
    const log = entry?.log
    const logs = log && item.done ? context.records.filter((r) => r.typeId === log.typeId && r.data[log.refField] === record.id
      && r.data.date === item.date && r.data.time === item.time).map((r) => r.id) : []
    return { ...item, sources: [...recordSources(record, titles.records, entry?.detailField), ...logs] }
  })
  const shown = items.slice(0, MAX_ROWS)
  const reply = items.length === 0 ? `No hay nada apuntado para ${label}.` : `Esto es lo apuntado para ${label}:`
  return { kind: 'agenda', text: reply, items: shown, remaining: items.slice(MAX_ROWS) }
}

function remaining(date: string, today: string): string {
  const days = diffDays(today, date)
  if (days === 0) return 'Caduca hoy.'
  if (days < 0) return days === -1 ? 'Caducó ayer.' : `Caducó hace ${-days} días.`
  return days === 1 ? 'Queda 1 día.' : `Quedan ${days} días.`
}

const STOP = new Set('cuando cuanto que cual cuales como caduca caducan caduco caducidad caducidades vence vencen vencimiento expira expiran renovar renueva hay los las del para con por mis tus sus nuestro documento documentos papeles fecha tiene tienen esta este proximo proximos pronto lista todos todo dime sabes hasta vale algun alguno'.split(' '))
const tokensOf = (text: string, people: readonly Member[]) => {
  const names = new Set(people.flatMap((m) => plain(m.name).split(' ')))
  return (text.match(/[a-z0-9ñ]{3,}/g) ?? []).filter((t) => !STOP.has(t) && !names.has(t))
}

export function expiry(text: string, context: ChatContext): Reply {
  const titles = titleContext(context.members, context.records)
  const people = mentioned(text, context.members)
  if (ambiguousNames(people).length > 0) return { kind: 'text', text: 'Hay más de una persona con ese nombre. ¿De quién es el documento?', link: { to: moduleLink('documents'), label: 'Ir a Documentación' } }
  const own = people.length === 0 && /\b(mi|mis|mio|mia)\b/.test(text) ? [context.actor] : people
  const tokens = tokensOf(text, context.members)
  const matches = ofType(context, 'document').filter((d) => {
    const words = plain(`${String(d.data.title)} ${fieldText(d, 'kind', titles)}`)
    const forPerson = own.length === 0 || own.some((m) => d.data.member === m.id || (d.data.member === undefined && mentioned(words, [m]).length > 0))
    return forPerson && tokens.every((t) => words.includes(t.replace(/s$/, '')))
  })
  const specific = tokens.length > 0 || own.length > 0
  const found = (specific ? matches : matches.filter((d) => d.data.expiryDate !== undefined))
    .toSorted((a, b) => String(a.data.expiryDate ?? '9').localeCompare(String(b.data.expiryDate ?? '9')))
  if (found.length === 0) return { kind: 'text', text: NOT_FOUND, link: { to: moduleLink('documents'), label: 'Ir a Documentación' } }
  const facts = found.slice(0, MAX_ROWS).map((d): Fact => {
    const date = d.data.expiryDate as string | undefined
    const read = date !== undefined && d.data.scannedDate === date ? ' Se leyó de una foto y se confirmó.' : ''
    return { key: d.id, recordId: d.id, title: recordTitle(d, titles), text: date === undefined ? 'Está guardado, pero no tiene caducidad apuntada.' : `Caduca el ${formatDate(date)}. ${remaining(date, context.today)}${read}` }
  })
  return { kind: 'facts', text: 'Según los documentos guardados:', facts }
}

/** Sobre quién se pregunta: los nombrados o, si no hay, quien pregunta por lo suyo. */
function subjects(text: string, context: ChatContext): Member[] {
  const people = mentioned(text, context.members)
  if (people.length > 0) return people
  return /\b(mi|mis|tengo|yo|soy)\b/.test(text) ? [context.actor] : []
}

const WHO: Reply = { kind: 'text', text: '¿De quién? Escríbelo con su nombre.' }

export function ages(text: string, context: ChatContext): Reply {
  const people = subjects(text, context)
  if (people.length === 0) return WHO
  const facts = people.map((m): Fact => {
    const age = ageOn(m.birthDate, context.today)
    const born = formatDate(m.birthDate)
    return { key: m.id, memberId: m.id, title: m.name, text: `Tiene ${age} ${age === 1 ? 'año' : 'años'}. Nació el ${born}.` }
  })
  return { kind: 'facts', text: ambiguousNames(people).length > 0 ? 'Hay más de una persona con ese nombre:' : 'Según su perfil:', facts }
}

export function allergies(text: string, context: ChatContext): Reply {
  const titles = titleContext(context.members, context.records)
  const people = subjects(text, context)
  const about = people.length > 0 ? people : context.members
  const records = ofType(context, 'dietNeed', 'condition').filter((r) => ['allergy', 'intolerance'].includes(String(r.data.kind)) && about.some((m) => m.id === r.data.member))
  if (records.length === 0) {
    const of = people.length > 0 ? ` de ${people.map((m) => m.name).join(' y ')}` : ''
    return { kind: 'text', text: `No hay ninguna alergia ni intolerancia apuntada${of} entre lo que puedes ver. Eso no significa que no exista.` }
  }
  const facts = records.slice(0, MAX_ROWS).map((r): Fact => ({
    key: r.id, recordId: r.id, title: `${titles.members.get(String(r.data.member))?.name ?? ''}: ${recordTitle(r, titles)}`,
    text: [fieldText(r, 'kind', titles), r.typeId === 'dietNeed' ? fieldText(r, 'severity', titles) : ''].filter(Boolean).join('. '),
  }))
  return { kind: 'facts', text: 'Esto es lo apuntado. Comprueba siempre las etiquetas y pregunta si hay dudas:', facts }
}

export function medication(text: string, context: ChatContext): Reply {
  const titles = titleContext(context.members, context.records)
  const people = subjects(text, context)
  const current = (r: FamilyRecord) => r.data.endDate === undefined || String(r.data.endDate) >= context.today
  const plans = ofType(context, 'medicationPlan').filter((r) => current(r) && (people.length === 0 || people.some((m) => m.id === r.data.member)))
  if (plans.length === 0) return { kind: 'text', text: NOT_FOUND, link: { to: moduleLink('medication'), label: 'Ir a Medicación' } }
  const facts = plans.slice(0, MAX_ROWS).map((r): Fact => ({
    key: r.id, recordId: r.id, title: `${titles.members.get(String(r.data.member))?.name ?? ''}: ${recordTitle(r, titles)}`,
    text: `${fieldText(r, 'dose', titles)}, a las ${fieldText(r, 'times', titles)}`,
  }))
  return { kind: 'facts', text: 'Esto es lo apuntado. Manda siempre la receta:', facts }
}

export function phones(text: string, context: ChatContext): Reply {
  const tokens = tokensOf(text, []).filter((t) => !['telefono', 'numero', 'llamar', 'llamo', 'contacto', 'contactos', 'cual'].includes(t))
  const contacts = ofType(context, 'emergencyContact').filter((c) => { const words = plain(`${String(c.data.name)} ${String(c.data.relation ?? '')}`); return tokens.every((t) => words.includes(t)) })
  if (contacts.length === 0) return { kind: 'text', text: NOT_FOUND, link: { to: moduleLink('emergency'), label: 'Ir a Emergencias' } }
  return { kind: 'facts', text: 'En los contactos de emergencia:', facts: contacts.slice(0, MAX_ROWS).map((c): Fact => ({ key: c.id, recordId: c.id, title: String(c.data.name), text: String(c.data.phone), phone: String(c.data.phone) })) }
}

export function shoppingPending(context: ChatContext): Reply {
  const titles = titleContext(context.members, context.records)
  const items = ofType(context, 'shoppingItem').filter((r) => !r.data.bought)
  if (items.length === 0) return { kind: 'text', text: 'No hay nada pendiente en la compra.', link: { to: moduleLink('shopping'), label: 'Ir a Compras' } }
  const facts = items.slice(0, MAX_ROWS).map((r): Fact => {
    const amount = [r.data.quantity, r.data.unit].filter((v) => v !== undefined).join(' ')
    return { key: r.id, recordId: r.id, title: recordTitle(r, titles), text: amount || fieldText(r, 'list', titles),
      sources: recordSources(r, titles.records, amount ? undefined : 'list') }
  })
  return { kind: 'facts', text: 'Falta por comprar:', facts }
}
