import { useId, type ReactNode } from 'react'
import { cx } from '@/utils/cx'

/** Superficie plana con zócalo: se apoya en la pared en vez de flotar sobre ella. */
export function Panel({ title, action, children, className }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  const titleId = useId()
  return (
    <section aria-labelledby={title ? titleId : undefined} className={cx('bg-crema p-5 shadow-panel sm:p-6', className)}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title && <h2 id={titleId} className="text-xl font-bold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="border-2 border-dashed border-borde px-5 py-8 text-center">
      <p className="text-lg font-bold">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-prose text-apagado">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
