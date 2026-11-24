import { HELP } from '@/data/help'
import { EXPENSE_CATEGORIES } from '@/modules/finance'
import { budgetAmounts, currentBudgets, monthSummary } from '@/services/finance'
import { accessTo, canComplete } from '@/services/permissions'
import { searchHome } from '@/services/search'
import { recordTitle, titleContext } from '@/services/titles'
import { formatMoney } from '@/utils/format'
import { moduleLink } from '@/utils/links'
import { matches } from '@/utils/text'
import type { ChatContext, Reply } from './types'
import { recordSources } from './visibility'
import { plain } from './when'

const article = (text: string) => text.trim().replace(/^(?:el|la|los|las|una?|unos|unas) /, '')
const clean = (text: string) => text.replace(/[¿?¡!.,;:]+$/g, '').trim()
const lookFor = (text: string) => article(clean(text))

export function completion(text: string, { records, actor }: ChatContext): Reply {
  const title = lookFor(clean(text).replace(/ como (?:hech[ao]|completad[ao])$/, ''))
  if (!title) return { kind: 'text', text: '¿Qué tarea has hecho? Escribe su nombre.' }
  const choices = records.flatMap((record) => {
    const { data } = record
    if (record.typeId !== 'task' || data.done || typeof data.title !== 'string'
      || lookFor(plain(data.title)) !== title || !canComplete(actor, record)) return []
    return [{ recordId: record.id, updatedAt: record.updatedAt }]
  })
  if (choices.length === 0) return { kind: 'text', text: 'No encuentro una tarea pendiente con ese nombre que puedas marcar. Escribe el nombre tal como sale en Tareas.', link: { to: moduleLink('planner'), label: 'Ir a Tareas' } }
  return { kind: 'complete', text: choices.length === 1 ? 'Confirma si ya has hecho esta tarea.' : 'Hay varias tareas con ese nombre. ¿Cuál has hecho?', choices }
}

export function search(text: string, { records, members, actor, enabled }: ChatContext): Reply {
  const query = lookFor(text)
  if (!query) return { kind: 'text', text: '¿Qué quieres buscar? Por ejemplo «busca el DNI».' }
  const modules = enabled.filter((id) => accessTo(actor, id) !== 'none')
  const result = searchHome({ query, records, members, modules })
  const context = titleContext(members, records)
  const facts = [
    ...result.records.map((record) => ({ key: record.id, recordId: record.id, title: recordTitle(record, context), text: '',
      sources: recordSources(record, context.records) })),
    ...result.people.map((member) => ({ key: `persona:${member.id}`, memberId: member.id, title: member.name, text: '' })),
    ...result.modules.map((module) => ({ key: `lugar:${module.id}`, title: module.name, text: '', to: moduleLink(module.id), moduleId: module.id })),
  ]
  if (!facts.length) return { kind: 'text', text: 'No encuentro nada así entre lo que puede ver tu perfil.', link: { to: '/buscar', label: 'Ir a Buscar' } }
  return { kind: 'facts', text: facts.length > 12 ? 'Estas son las primeras coincidencias. En Buscar puedes ver el resto.' : 'Esto es lo que he encontrado.', facts: facts.slice(0, 12) }
}

export function budget(text: string, { records, actor, today, enabled }: ChatContext): Reply {
  if (!enabled.includes('finances') || accessTo(actor, 'finances') === 'none') return { kind: 'text', text: 'Finanzas no está disponible para tu perfil.' }
  const name = lookFor(text).replace(/ (?:este mes|del mes)$/, '')
  const category = EXPENSE_CATEGORIES.find(({ label }) => plain(label) === name || (label === 'Alimentación' && ['comida', 'comidas'].includes(name)))
  if (!category) return { kind: 'text', text: '¿De qué categoría quieres saber el gasto de este mes? Por ejemplo «¿cuánto llevamos en comida?»', link: { to: moduleLink('finances'), label: 'Ir a Finanzas' } }
  const expenses = records.filter((record) => record.typeId === 'transaction' && record.data.kind !== 'income'
    && record.data.category === category.value && monthSummary([record], today).expense !== 0)
  const cap = currentBudgets(records).get(category.value)
  const sources = [...expenses, ...(cap ? [cap] : [])]
  const { spent, limit } = monthSummary(sources, today).categories.find((item) => item.category === category.value) ?? { spent: 0 }
  return {
    kind: 'facts', text: 'Gastos de este mes.',
    facts: [{
      key: category.value, title: category.label, to: moduleLink('finances'), moduleId: 'finances', sources: sources.map((record) => record.id),
      text: limit === undefined ? `${formatMoney(spent)}. No hay un tope apuntado.` : budgetAmounts(spent, limit),
    }],
  }
}

export function help(text: string): Reply {
  const ask = lookFor(text)
  const topics = HELP.flatMap((group) => group.topics)
  const id = /\b(?:recuper|restaur)\w*/.test(ask) ? 'recuperar' : /\b(?:borr|elimin)\w*/.test(ask) ? 'borrar' : undefined
  const topic = id ? topics.find((item) => item.id === id) : topics.find((item) => ask && matches(item.question, ask))
  return topic
    ? { kind: 'text', text: topic.steps.join(' '), link: { to: `/ayuda#${topic.id}`, label: `Ver en Ayuda: ${topic.question.toLowerCase()}` } }
    : { kind: 'text', text: 'En Ayuda puedes buscar lo que quieres hacer.', link: { to: '/ayuda', label: 'Ir a Ayuda' } }
}
