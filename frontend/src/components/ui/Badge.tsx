/** El número siempre lleva su significado para quien no lo ve: «3 pendientes». */
export function CountBadge({ count, label, className = 'bg-madera text-crema' }: { count: number; label: string; className?: string }) {
  if (count <= 0) return null
  return (
    <span className={`inline-grid min-h-8 min-w-8 place-items-center px-2 font-bold tabular-nums ${className}`}>
      <span aria-hidden="true">{count > 99 ? '99+' : count}</span>
      <span className="sr-only">{count} {label}</span>
    </span>
  )
}
