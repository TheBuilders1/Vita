import { ExternalLink } from 'lucide-react'
import { domainOf } from '@/utils/webLinks'

/** El dominio manda: es lo que dice a dónde se va de verdad. */
export function LinkItem({ link }: { link: string }) {
  return (
    <a href={link} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-3 bg-yeso p-2 leading-snug">
      <ExternalLink aria-hidden="true" className="size-5 shrink-0" />
      <span className="min-w-0"><span className="block font-bold break-all underline underline-offset-4">{domainOf(link)}<span className="sr-only"> (se abre en otra pestaña)</span></span><span className="block truncate text-apagado">{link}</span></span>
    </a>
  )
}
