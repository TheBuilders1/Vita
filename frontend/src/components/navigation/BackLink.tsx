import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'

/** El texto dice a dónde se vuelve: «Volver al edificio». */
export function BackLink({ to, children }: { to: string; children: string }) {
  return (
    <Link to={to} className="inline-flex min-h-11 items-center gap-2 font-bold underline underline-offset-4">
      <ArrowLeft aria-hidden="true" className="size-5" />
      {children}
    </Link>
  )
}
