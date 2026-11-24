import { Camera, ExternalLink, Images, Paperclip, RefreshCw, X, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useHome } from '@/app/providers/home'
import { FieldError } from '@/components/ui/Field'
import { repositories } from '@/database'
import { useFile } from '@/hooks/useFile'
import { describeError } from '@/services/errors'
import { ACCEPTED_TYPES } from '@/types/records'
import { formatBytes } from '@/utils/format'
import { preparePhoto } from '@/utils/photo'

interface FilesProps {
  label: string
  help?: string | undefined
  error?: string | undefined
  value: string[]
  onChange: (ids: string[]) => void
  /** Mientras se guarda un archivo no se debe guardar el formulario: se quedaría fuera. */
  onBusy?: ((busy: boolean) => void) | undefined
}

const ACCEPTED = ACCEPTED_TYPES.join(',')
/** Sin `image/*`: así el iPhone entrega JPG en vez de HEIC. */
const PHOTOS = ACCEPTED_TYPES.filter((t) => t.startsWith('image/')).join(',')
/** En un ordenador, «hacer una foto» abriría el mismo selector de archivos. */
const hasCamera = () => matchMedia('(pointer: coarse)').matches

/** Los archivos se guardan al elegirlos; si el formulario no llega a guardarse, se limpian al día siguiente. */
export function FilesInput({ label, help, error, value, onChange, onBusy }: FilesProps) {
  const { actor } = useHome()
  const [problems, setProblems] = useState<string[]>([])
  const [progress, setProgress] = useState<string>()
  const [touch] = useState(hasCamera)
  // Se puede quitar un archivo mientras se guarda otro: hay que partir de la lista del momento.
  const latest = useRef(value)
  useEffect(() => { latest.current = value }, [value])
  const change = (ids: string[]) => { latest.current = ids; onChange(ids) }
  const busy = progress !== undefined

  const add = async (files: readonly File[], replaced?: string) => {
    if (files.length === 0) return
    setProblems([])
    onBusy?.(true)
    for (const [i, file] of files.entries()) {
      setProgress(files.length === 1 ? 'Guardando…' : `Guardando ${i + 1} de ${files.length}…`)
      try {
        const { id } = await repositories.files.add(actor.id, await preparePhoto(file))
        const list = latest.current
        change(replaced !== undefined && list.includes(replaced) ? list.map((v) => (v === replaced ? id : v)) : [...list, id])
      } catch (cause) {
        // Uno rechazado no frena a los demás.
        setProblems((known) => [...known, `${file.name}: ${describeError(cause)}`])
      }
    }
    setProgress(undefined)
    onBusy?.(false)
  }
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 max-w-full font-bold">{label}<span className="font-normal text-apagado"> (opcional)</span></legend>
      <p className="mb-2 text-apagado">{help ?? 'Fotos, PDF o texto. Las fotos grandes se reducen solas; lo demás, hasta 15 MB.'}</p>
      {value.length > 0 && (
        <ul className="mb-3 grid grid-cols-1 gap-2">
          {value.map((id) => <FileRow key={id} id={id} disabled={busy} onReplace={(files) => { void add(files, id) }} onRemove={() => change(latest.current.filter((v) => v !== id))} />)}
        </ul>
      )}
      <div className="flex flex-wrap gap-3">
        {touch && <Picker icon={Camera} label="Hacer una foto" accept="image/*" capture disabled={busy} onPick={add} />}
        {touch && <Picker icon={Images} label="Elegir fotos" accept={PHOTOS} multiple disabled={busy} onPick={add} />}
        <Picker icon={Paperclip} label="Elegir archivos" accept={ACCEPTED} multiple disabled={busy} onPick={add} />
      </div>
      <output className="mt-2 block font-bold empty:hidden">{progress}</output>
      <div role="alert">{[...problems, ...(error ? [error] : [])].map((p) => <FieldError key={p} id={undefined} message={p} />)}</div>
    </fieldset>
  )
}

interface PickerProps { icon: LucideIcon; label: string; accept: string; multiple?: boolean; capture?: boolean; disabled: boolean; onPick: (files: readonly File[]) => Promise<void> }

function Picker({ icon: Icon, label, accept, multiple = false, capture = false, disabled, onPick }: PickerProps) {
  return (
    <label className={`pixel-edge relative inline-flex min-h-11 items-center gap-2 bg-crema px-4 font-bold has-focus-visible:outline-3 has-focus-visible:outline-offset-4 has-focus-visible:outline-foco ${disabled ? 'opacity-60' : ''}`}>
      <Icon aria-hidden="true" className="size-5 shrink-0" />
      {label}
      <FileChooser accept={accept} multiple={multiple} capture={capture} disabled={disabled} onPick={(files) => { void onPick(files) }} />
    </label>
  )
}

function FileChooser({ capture = false, onPick, ...props }: { accept: string; multiple?: boolean; capture?: boolean; disabled: boolean; onPick: (files: readonly File[]) => void }) {
  // Vaciarlo permite volver a elegir el mismo archivo; la lista se vacía con él y por eso se copia antes.
  return <input type="file" {...props} {...(capture && { capture: 'environment' as const })} className="sr-only" onChange={(e) => { const files = [...(e.target.files ?? [])]; e.target.value = ''; onPick(files) }} />
}

const ACTION = 'inline-flex min-h-11 items-center gap-2 font-bold underline underline-offset-4'

function FileRow({ id, disabled, onReplace, onRemove }: { id: string; disabled: boolean; onReplace: (files: readonly File[]) => void; onRemove: () => void }) {
  const { file, url } = useFile(id)
  if (file === undefined) return null
  const name = file?.name ?? 'Archivo que ya no está'
  return (
    <li className="bg-yeso p-2">
      <div className="flex items-center gap-3">
        {file && url && file.mime.startsWith('image/') ? <img src={url} alt="" className="size-14 shrink-0 object-cover" /> : <Paperclip aria-hidden="true" className="size-6 shrink-0" />}
        <span className="min-w-0 flex-1 break-words">{name} {file && <span className="text-apagado">({formatBytes(file.size)})</span>}</span>
      </div>
      <div className="flex flex-wrap gap-x-5">
        {file && url && <a href={url} target="_blank" rel="noopener" className={ACTION}><ExternalLink aria-hidden="true" className="size-5" />Abrir<span className="sr-only"> {name} en otra pestaña</span></a>}
        <label className={`${ACTION} relative has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-foco ${disabled ? 'opacity-60' : ''}`}>
          <RefreshCw aria-hidden="true" className="size-5" />Cambiar<span className="sr-only"> {name} por otro</span>
          <FileChooser accept={ACCEPTED} disabled={disabled} onPick={onReplace} />
        </label>
        <button type="button" onClick={onRemove} className={ACTION}><X aria-hidden="true" className="size-5" />Quitar<span className="sr-only"> {name}</span></button>
      </div>
    </li>
  )
}
