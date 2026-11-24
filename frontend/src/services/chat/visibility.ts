import { getRecordType } from '@/modules/registry'
import { accessTo, canRead } from '@/services/permissions'
import type { FamilyRecord } from '@/types/records'
import type { AgendaMatch, CardStatus, ChatContext, Contact, Fact, Proposal, Reply } from './types'

export const UNAVAILABLE = 'Esto ya no está disponible para tu perfil'
const hidden = { kind: 'text', text: UNAVAILABLE } as const
type Hidden<T> = T & { readonly unavailable: true }
type Reviewed<T, K> = T | Hidden<K>

export type ReviewedReply =
  | Extract<Reply, { kind: 'text' | 'complete' }>
  | { readonly kind: 'agenda'; readonly text: string; readonly items: readonly Reviewed<AgendaMatch, Pick<AgendaMatch, 'key'>>[]; readonly more: number }
  | { readonly kind: 'facts'; readonly text: string; readonly facts: readonly Reviewed<Fact, Pick<Fact, 'key'>>[] }
  | { readonly kind: 'proposals'; readonly text: string; readonly proposals: readonly Reviewed<Proposal, object>[] }
  | (Omit<Extract<Reply, { kind: 'emergency' }>, 'contacts'> & { readonly contacts: readonly Reviewed<Contact, Pick<Contact, 'recordId'>>[] })

/** Identificadores de las fichas que aportaron un título o un campo de referencia. */
export function recordSources(record: FamilyRecord, records: ReadonlyMap<string, FamilyRecord>, detail?: string): string[] {
  const sources = new Set<string>()
  function visit(source: FamilyRecord, field?: string) {
    if (sources.has(source.id)) return
    sources.add(source.id)
    const type = getRecordType(source.typeId)
    const fields = [type.titleField, field, source.typeId === 'mealPlan' && source.data.dish === undefined ? 'recipe' : undefined]
    for (const name of fields) {
      if (name === undefined || type.fields[name]?.kind !== 'record') continue
      const value = source.data[name]
      const target = typeof value === 'string' ? records.get(value) : undefined
      if (target) visit(target)
    }
  }
  visit(record, detail)
  return [...sources]
}

type ViewContext = Pick<ChatContext, 'actor' | 'enabled' | 'members' | 'records'>

/** Revisa las fuentes justo antes de mostrar una respuesta guardada. */
export function reviewReply(reply: Reply, { actor, enabled, members, records }: ViewContext, cards: Readonly<Record<number, CardStatus>> = {}): ReviewedReply {
  const modules = new Set(enabled.filter((id) => accessTo(actor, id) !== 'none'))
  const visible = new Set(records.filter((record) => modules.has(record.moduleId) && canRead(actor, record)).map((record) => record.id))
  const people = new Set(members.map((member) => member.id))
  const savedVisible = (index: number) => {
    const status = cards[index]
    return status?.state !== 'saved' || visible.has(status.recordId)
  }
  const agendaVisible = (item: AgendaMatch) => modules.has(item.moduleId) && item.sources.every((id) => visible.has(id))
    && (item.recordId !== undefined || item.memberIds.every((id) => people.has(id)))

  switch (reply.kind) {
    case 'text': return reply
    case 'facts': {
      const facts = reply.facts.map((fact) => (
        (fact.recordId === undefined || visible.has(fact.recordId))
        && (fact.memberId === undefined || people.has(fact.memberId))
        && (fact.moduleId === undefined || modules.has(fact.moduleId))
        && (fact.sources?.every((id) => visible.has(id)) ?? true)
      ) ? fact : { key: fact.key, unavailable: true } as const)
      return facts.every((fact) => 'unavailable' in fact) ? hidden : { ...reply, facts }
    }
    case 'agenda': {
      const items = reply.items.map((item) => agendaVisible(item) ? item : { key: item.key, unavailable: true } as const)
      const more = reply.remaining.filter(agendaVisible).length
      return (items.length > 0 && items.every((item) => 'unavailable' in item) && more === 0) ? hidden : { kind: 'agenda', text: reply.text, items, more }
    }
    case 'proposals': {
      const proposals = reply.proposals.map((proposal, index) => savedVisible(index) ? proposal : { unavailable: true } as const)
      return proposals.every((proposal) => 'unavailable' in proposal) ? hidden : { ...reply, proposals }
    }
    case 'complete': {
      if (!savedVisible(0)) return hidden
      if (cards[0]?.state === 'saved') return reply
      const choices = reply.choices.filter((choice) => visible.has(choice.recordId))
      return choices.length === 0 ? hidden : { ...reply, choices }
    }
    case 'emergency':
      return { ...reply, contacts: reply.contacts.map((contact) => visible.has(contact.recordId) ? contact : { recordId: contact.recordId, unavailable: true }) }
  }
}
