import { Download, ExternalLink, FileText } from 'lucide-react'
import { useFile } from '@/hooks/useFile'
import { formatBytes } from '@/utils/format'

const ACTION = 'inline-flex min-h-11 items-center gap-2 font-bold underline underline-offset-4'

/** Imágenes a la vista; lo demás se abre o se descarga. */
export function FileViewer({ id }: { id: string }) {
  const { file, url } = useFile(id)
  if (file === null) return <p className="bg-yeso p-3">Este archivo ya no está disponible.</p>
  if (!file || !url) return <output className="block p-3">Abriendo archivo…</output>
  return (
    <figure className="bg-yeso p-2">
      {file.mime.startsWith('image/') && <img src={url} alt={file.name} className="mb-2 max-h-96 w-full object-contain" />}
      <figcaption className="flex flex-wrap items-center gap-x-5">
        <span className="flex min-w-0 flex-1 basis-48 items-center gap-3"><FileText aria-hidden="true" className="size-5 shrink-0" /><span className="min-w-0 break-words">{file.name} ({formatBytes(file.size)})</span></span>
        <a href={url} target="_blank" rel="noopener" className={ACTION}><ExternalLink aria-hidden="true" className="size-5" />Abrir<span className="sr-only"> {file.name} en otra pestaña</span></a>
        <a href={url} download={file.name} className={ACTION}><Download aria-hidden="true" className="size-5" />Descargar<span className="sr-only"> {file.name}</span></a>
      </figcaption>
    </figure>
  )
}
