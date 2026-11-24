import { Paperclip, X } from 'lucide-react'
import { useId, useState } from 'react'
import { useHome } from '@/app/providers/home'
import { FieldError } from '@/components/ui/Field'
import { repositories } from '@/database'
import { useFile } from '@/hooks/useFile'
import { describeError } from '@/services/errors'
import { ACCEPTED_TYPES } from '@/types/records'
import { formatBytes } from '@/utils/format'

interface FilesProps { label: string; help?: string | undefined; value: string[]; onChange: (ids: string[]) => void }

/** Los archivos se guardan al elegirlos; si el formulario no llega a guardarse, se limpian al día siguiente. */
export function FilesInput({ label, help, value, onChange }: FilesProps) {
  const { actor } = useHome()
  const id = useId()
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  const add = async (files: FileList | null) => {
    if (!files) return
    setBusy(true)
    setError(undefined)
    const added: string[] = []
    try {
      for (const file of files) added.push((await repositories.files.add(actor.id, file)).id)
    } catch (cause) {
      setError(describeError(cause))
    }
    onChange([...value, ...added])
    setBusy(false)
  }
  return (
    <div>
      <p className="mb-1.5 font-bold">{label}<span className="font-normal text-apagado"> (opcional)</span></p>
      <p className="mb-2 text-apagado">{help ?? 'Imágenes, PDF o texto, hasta 15 MB cada uno.'}</p>
      <ul className="mb-2 grid grid-cols-1 gap-2">{value.map((fileId) => <FileRow key={fileId} id={fileId} onRemove={() => onChange(value.filter((v) => v !== fileId))} />)}</ul>
      <label htmlFor={id} className="pixel-edge inline-flex min-h-11 items-center gap-2 bg-crema px-4 font-bold has-focus-visible:outline-3 has-focus-visible:outline-offset-4 has-focus-visible:outline-foco">
        <Paperclip aria-hidden="true" className="size-5" />
        {busy ? 'Guardando…' : 'Elegir archivos'}
        <input id={id} type="file" multiple accept={ACCEPTED_TYPES.join(',')} disabled={busy} className="sr-only" onChange={(e) => { void add(e.target.files); e.target.value = '' }} />
      </label>
      <FieldError id={undefined} message={error} />
    </div>
  )
}

function FileRow({ id, onRemove }: { id: string; onRemove: () => void }) {
  const { file, url } = useFile(id)
  if (!file) return null
  return (
    <li className="flex items-center gap-3 bg-yeso p-2">
      {url && file.mime.startsWith('image/') ? <img src={url} alt="" className="size-12 object-cover" /> : <Paperclip aria-hidden="true" className="size-6" />}
      <span className="min-w-0 flex-1 truncate">{file.name} <span className="text-apagado">({formatBytes(file.size)})</span></span>
      <button type="button" onClick={onRemove} className="grid size-11 place-items-center" aria-label={`Quitar ${file.name}`}><X aria-hidden="true" className="size-5" /></button>
    </li>
  )
}
