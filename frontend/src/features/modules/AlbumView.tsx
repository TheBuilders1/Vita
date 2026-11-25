import { useState } from 'react'
import { SelectInput } from '@/components/ui/Field'
import { MEMORY_CATEGORIES } from '@/modules/leisure'
import { ImageIcon } from 'lucide-react'
import { EmptyState } from '@/components/ui/Panel'
import { useRecordEditor } from '@/features/records/editor'
import { useFile } from '@/hooks/useFile'
import type { FamilyRecord } from '@/types/records'
import { formatDate } from '@/utils/format'
import { useRecords } from './shared'

export function AlbumView() {
  const memories = useRecords('memory').toSorted((a, b) => String(b.data.date).localeCompare(String(a.data.date)))
  const [category, setCategory] = useState('')
  const visible = memories.filter((memory) => !category || (memory.data.category ?? 'other') === category)
  const editor = useRecordEditor()
  if (memories.length === 0) return <EmptyState title="El álbum está por estrenar">Guarda una foto o una historia para recordarla juntos.</EmptyState>
  return (
    <div className="grid gap-4">
      <SelectInput label="Categoría" required empty="Todas" value={category} options={MEMORY_CATEGORIES} onChange={(e) => setCategory(e.target.value)} />
      {visible.length === 0 && <p>No hay recuerdos en esta categoría.</p>}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">{visible.map((m) => <Memory key={m.id} memory={m} onOpen={() => editor.open(m.id)} />)}</ul>
    </div>
  )
}

function Memory({ memory, onOpen }: { memory: FamilyRecord; onOpen: () => void }) {
  const [cover] = (memory.data.files ?? []) as string[]
  return (
    <li>
      <button type="button" onClick={onOpen} className="w-full bg-yeso p-2 text-left hover:bg-beige">
        <span className="grid aspect-square place-items-center overflow-hidden bg-beige">{cover ? <Cover id={cover} /> : <ImageIcon aria-hidden="true" className="size-10 text-apagado" />}</span>
        <span className="mt-2 block break-words leading-snug font-bold">{String(memory.data.title)}</span>
        <span className="block text-apagado">{formatDate(String(memory.data.date))}</span>
      </button>
    </li>
  )
}

function Cover({ id }: { id: string }) {
  const { file, url } = useFile(id)
  if (!file || !url || !file.mime.startsWith('image/')) return <ImageIcon aria-hidden="true" className="size-10 text-apagado" />
  return <img src={url} alt="" loading="lazy" className="size-full object-cover" />
}
