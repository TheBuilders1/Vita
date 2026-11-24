import { GUIDES } from '@/data/guides'
import type { ModuleId } from '@/modules/types'

export function GuideList({ moduleId }: { moduleId: ModuleId }) {
  const guides = GUIDES[moduleId]
  if (!guides) return null
  return (
    <section aria-label="Orientación">
      <h3 className="mb-2 text-lg font-bold">Orientación</h3>
      <div className="grid grid-cols-1 gap-2">
        {guides.map((g) => (
          <details key={g.title} className="border-2 border-beige">
            <summary className="min-h-12 px-4 py-2.5 font-bold">{g.title}</summary>
            <ul className="list-disc px-4 pb-4 pl-9">{g.points.map((p) => <li key={p}>{p}</li>)}</ul>
          </details>
        ))}
      </div>
    </section>
  )
}
