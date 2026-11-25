import { Check, Pencil } from 'lucide-react'
import { Link } from 'react-router'
import { useHome } from '@/app/providers/home'
import { Button } from '@/components/ui/Button'
import { useRecordEditor } from '@/features/records/editor'
import { useCompletion } from '@/hooks/useCompletion'
import { useToday } from '@/hooks/useToday'
import type { AgendaItem } from '@/services/agenda'
import { formatNear } from '@/utils/format'
import { CATEGORIES } from './categories'

interface AgendaRowProps { item: AgendaItem; showDate?: boolean; size?: 'md' | 'lg' }

/** Una línea de la agenda: qué, cuándo, quién y cómo darlo por hecho. */
export function AgendaRow({ item, showDate = false, size = 'md' }: AgendaRowProps) {
  const { members, actor } = useHome()
  const { recordId } = item
  const today = useToday()
  const editor = useRecordEditor()
  const completion = useCompletion().forItem(item)
  const { icon: Icon, label: category, text, bar } = CATEGORIES[item.category]
  const names = item.memberIds.map((id) => members.find((m) => m.id === id)?.name ?? '').filter((name) => name && !item.title.includes(name))
  const people = item.memberIds.length === 1 && item.memberIds[0] === actor.id ? [] : names
  const when = [showDate && item.date ? formatNear(item.date, today) : '', item.time ? `a las ${item.time}` : ''].filter(Boolean).join(' ')
  const details = [item.label, item.detail, people.join(', ')].filter(Boolean).map((t) => String(t).replace(/\.$/, '')).join('. ')
  return (
    <li className={`flex flex-wrap items-center gap-x-3 gap-y-2 border-l-4 bg-crema py-2 pr-1 pl-3 ${bar}`}>
      <Icon aria-hidden="true" className={`shrink-0 ${text} ${size === 'lg' ? 'size-8' : 'size-5'}`} />
      <div className={`min-w-[min(9rem,100%)] flex-1 leading-snug [overflow-wrap:anywhere] ${size === 'lg' ? 'text-xl' : ''}`}>
        <span className="sr-only">{category}: </span>
        {item.taskPreview ? <span className={`font-bold ${item.done ? 'line-through' : ''}`}>{item.title}</span>
          : recordId ? <button type="button" onClick={() => editor.open(recordId)} className={`min-h-11 min-w-11 max-w-full text-left font-bold underline-offset-4 hover:underline ${item.done ? 'line-through' : ''}`}>{item.title}</button>
          : <Link to="/hogar" className="inline-flex min-h-11 min-w-11 max-w-full items-center font-bold underline-offset-4 hover:underline">{item.title}</Link>}
        {when && <span className="block">{when.charAt(0).toUpperCase() + when.slice(1)}</span>}
        {details && <span className="block text-apagado">{details}</span>}
        {item.done && <span className="block text-apagado">{item.logStatus === 'skipped' ? 'No tomada' : 'Hecho'}</span>}
      </div>
      {recordId && <Button size="sm" icon={Pencil} onClick={() => editor.open(recordId)}>Cambiar<span className="sr-only">: {item.title}</span></Button>}
      {completion && <Button variant="confirm" size={size === 'lg' ? 'lg' : 'sm'} icon={Check} className="max-w-full [overflow-wrap:anywhere] max-[24rem]:px-3" onClick={completion.run}>{completion.label}<span className="sr-only">: {item.title}</span></Button>}
    </li>
  )
}
