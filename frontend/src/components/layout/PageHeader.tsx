import type { ReactNode } from 'react'

export function PageHeader({ title, description, back, action }: { title: string; description?: string; back?: ReactNode; action?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <div className="min-w-0">
        {back}
        <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-prose text-lg">{description}</p>}
      </div>
      {action}
    </header>
  )
}
