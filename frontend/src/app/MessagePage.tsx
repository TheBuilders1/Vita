import type { ReactNode } from 'react'

export function MessagePage({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="mt-4">{children}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
