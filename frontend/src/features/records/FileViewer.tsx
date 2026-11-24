import { Download, FileText } from 'lucide-react'
import { useFile } from '@/hooks/useFile'
import { formatBytes } from '@/utils/format'

/** Imágenes a la vista; lo demás se descarga. */
export function FileViewer({ id }: { id: string }) {
  const { file, url } = useFile(id)
  if (!file || !url) return null
  return (
    <figure className="bg-yeso p-2">
      {file.mime.startsWith('image/') && <img src={url} alt={file.name} className="mb-2 max-h-96 w-full object-contain" />}
      <figcaption className="flex flex-wrap items-center gap-3">
        <FileText aria-hidden="true" className="size-5" />
        <span className="min-w-0 flex-1 truncate">{file.name} ({formatBytes(file.size)})</span>
        <a href={url} download={file.name} className="inline-flex min-h-11 items-center gap-2 font-bold underline underline-offset-4"><Download aria-hidden="true" className="size-5" />Descargar</a>
      </figcaption>
    </figure>
  )
}
