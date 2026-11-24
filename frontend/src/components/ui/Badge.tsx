import { CircleAlert } from 'lucide-react'

/** Icono de atención y número; para quien no lo ve, también su significado: «3 pendientes». */
export function CountBadge({ count, label, className = 'bg-madera text-crema' }: { count: number; label: string; className?: string }) {
  if (count <= 0) return null
  return (
    <span className={`inline-flex min-h-8 min-w-8 items-center justify-center gap-1 px-1.5 font-bold tabular-nums ${className}`}>
      <CircleAlert aria-hidden="true" className="size-5 shrink-0" />
      <span aria-hidden="true">{count > 99 ? '99+' : count}</span>
      <span className="sr-only">{count} {label}</span>
    </span>
  )
}
