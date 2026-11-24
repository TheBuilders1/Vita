import { FileText } from 'lucide-react'
import { useHome } from '@/app/providers/home'
import { Block } from '@/features/modules/shared'
import { useFile } from '@/hooks/useFile'
import { filesOf } from '@/services/integrity'
import { recordTitle, titleContext } from '@/services/titles'
import type { FamilyRecord } from '@/types/records'
import { useRecordEditor } from './editor'
import { LinkItem } from './LinkItem'

const linksOf = (record: FamilyRecord) => (record.data.links ?? []) as string[]

/** Todo lo adjunto de un vistazo, junto al registro al que pertenece. */
export function Attachments({ records }: { records: readonly FamilyRecord[] }) {
  const { members, records: all } = useHome()
  const editor = useRecordEditor()
  const context = titleContext(members, all)
  const withSome = records.filter((r) => filesOf(r.typeId, r.data).length + linksOf(r).length > 0)
  if (withSome.length === 0) return null
  return (
    <Block title="Archivos y enlaces">
      <ul className="grid grid-cols-1 gap-5">
        {withSome.map((r) => (
          <li key={r.id}>
            <button type="button" onClick={() => editor.open(r.id)} className="min-h-11 text-left font-bold underline underline-offset-4">{recordTitle(r, context)}</button>
            <ul className="grid grid-cols-1 gap-2">
              {filesOf(r.typeId, r.data).map((id) => <li key={id}><FileItem id={id} /></li>)}
              {linksOf(r).map((link) => <li key={link}><LinkItem link={link} /></li>)}
            </ul>
          </li>
        ))}
      </ul>
    </Block>
  )
}

function FileItem({ id }: { id: string }) {
  const { file, url } = useFile(id)
  if (file === null) return <p className="bg-yeso p-3">Este archivo ya no está disponible.</p>
  if (!file || !url) return null
  return (
    <a href={url} target="_blank" rel="noopener" className="flex min-h-11 items-center gap-3 bg-yeso p-2 leading-snug">
      {file.mime.startsWith('image/') ? <img src={url} alt="" loading="lazy" className="size-14 shrink-0 object-cover" /> : <FileText aria-hidden="true" className="size-6 shrink-0" />}
      <span className="min-w-0 font-bold break-words underline underline-offset-4">{file.name}<span className="sr-only"> (se abre en otra pestaña)</span></span>
    </a>
  )
}
