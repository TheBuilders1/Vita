import { CircleAlert, CircleCheck, Clock } from 'lucide-react'
import { useHome } from '@/app/providers/home'
import { useRecordEditor } from '@/features/records/editor'
import { Attachments } from '@/features/records/Attachments'
import { useToday } from '@/hooks/useToday'
import { diffDays } from '@/utils/dates'
import { formatDate } from '@/utils/format'
import { Block, ModuleRecords, useRecords } from './shared'

const SOON_DAYS = 60

export function DocumentsView() {
  const { members } = useHome()
  const today = useToday()
  const editor = useRecordEditor()
  const documents = useRecords('document')
  const expiring = documents.filter((d) => d.data.expiryDate).toSorted((a, b) => String(a.data.expiryDate).localeCompare(String(b.data.expiryDate)))
  return (
    <div className="grid grid-cols-1 gap-6">
      {expiring.length > 0 && (
        <Block title="Caducidades">
          <ul className="border-t-2 border-beige">
            {expiring.map((d) => {
              const days = diffDays(today, String(d.data.expiryDate))
              const [Icon, text, tone] = days < 0 ? [CircleAlert, 'Caducado', 'text-peligro'] as const : days <= SOON_DAYS ? [Clock, days === 0 ? 'Caduca hoy' : days === 1 ? 'Caduca mañana' : `Quedan ${days} días`, 'text-madera'] as const : [CircleCheck, 'En vigor', 'text-oliva'] as const
              return (
                <li key={d.id} className="flex flex-wrap items-center gap-x-4 border-b-2 border-beige">
                  <button type="button" onClick={() => editor.open(d.id)} className="min-h-14 flex-1 py-2 text-left leading-snug">
                    <span className="block font-bold underline-offset-4 hover:underline">{String(d.data.title)}</span>
                    <span className="text-apagado">{[members.find((m) => m.id === d.data.member)?.name, formatDate(String(d.data.expiryDate))].filter(Boolean).join(', ')}</span>
                  </button>
                  <span className={`flex items-center gap-2 font-bold ${tone}`}><Icon aria-hidden="true" className="size-5" />{text}</span>
                </li>
              )
            })}
          </ul>
        </Block>
      )}
      <ModuleRecords moduleId="documents" />
      <Attachments records={documents} />
      <p className="text-apagado">Los archivos se guardan en este navegador, sin cifrar. De los enlaces solo se guarda la dirección.</p>
    </div>
  )
}
