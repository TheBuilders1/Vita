import { Phone } from 'lucide-react'
import { Link } from 'react-router'
import { AgendaRow } from '@/features/calendar/AgendaRow'
import { useRecordEditor } from '@/features/records/editor'
import type { Fact, Reply } from '@/services/chat'
import type { Turn } from '@/store/chatStore'
import { chatStore } from '@/store'
import { telLink } from '@/utils/links'
import { ProposalCard } from './ProposalCard'

const LINK = 'inline-flex min-h-11 items-center font-bold underline underline-offset-4'

export function ReplyView({ turn }: { turn: Turn }) {
  const { reply } = turn
  return (
    <div className="grid grid-cols-1 gap-3">
      <p className="break-words">{reply.text}</p>
      <Extra reply={reply} turn={turn} />
    </div>
  )
}

function Extra({ reply, turn }: { reply: Reply; turn: Turn }) {
  switch (reply.kind) {
    case 'text': return reply.link ? <p><Link to={reply.link.to} className={LINK}>{reply.link.label}</Link></p> : null
    case 'agenda':
      return (
        <>
          {reply.items.length > 0 && <ul className="grid grid-cols-1 gap-2">{reply.items.map((item) => <AgendaRow key={item.key} item={item} showDate />)}</ul>}
          <p><Link to="/calendario" className={LINK}>{reply.more > 0 ? `Ver ${reply.more} más en el calendario` : 'Ir al calendario'}</Link></p>
        </>
      )
    case 'proposals': return reply.proposals.map((p, i) => <ProposalCard key={i} proposal={p} status={turn.cards[i]} onStatus={(status) => chatStore.getState().mark(turn.id, i, status)} />) // oxlint-disable-line react/no-array-index-key -- la lista no cambia
    case 'facts': return <ul className="grid grid-cols-1 gap-2">{reply.facts.map((f) => <li key={f.key} className="bg-yeso p-3"><FactRow fact={f} /></li>)}</ul>
    case 'emergency':
      return (
        <div className="grid grid-cols-1 gap-2">
          {reply.helpline && <Call name="Línea 024, atención a la conducta suicida" phone={reply.helpline} danger />}
          <Call name="Emergencias" phone={reply.number} danger />
          {reply.contacts.map((c) => <Call key={`${c.name}${c.phone}`} name={c.name} phone={c.phone} />)}
        </div>
      )
  }
}

/** El título lleva a la fuente del dato. */
function FactRow({ fact }: { fact: Fact }) {
  const editor = useRecordEditor()
  return (
    <>
      {fact.recordId && <button type="button" onClick={() => { if (fact.recordId) editor.open(fact.recordId) }} className={`${LINK} text-left`}>{fact.title}</button>}
      {fact.memberId && <Link to={`/hogar/${fact.memberId}`} className={LINK}>{fact.title}</Link>}
      {fact.phone ? <a href={telLink(fact.phone)} className="flex min-h-11 items-center gap-2 tabular-nums underline underline-offset-4"><Phone aria-hidden="true" className="size-5" /><span className="sr-only">Llamar al </span>{fact.text}</a> : <p>{fact.text}</p>}
    </>
  )
}

function Call({ name, phone, danger = false }: { name: string; phone: string; danger?: boolean }) {
  return (
    <a href={telLink(phone)} className={`pixel-edge flex min-h-16 items-center gap-4 px-4 py-2 text-lg font-bold ${danger ? 'bg-peligro text-crema [--edge:var(--color-peligro-hondo)]' : 'bg-crema'}`}>
      <Phone aria-hidden="true" className="size-7 shrink-0" />
      <span className="leading-tight">{name}<span className="block font-normal tabular-nums">{phone}</span></span>
    </a>
  )
}
