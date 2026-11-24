import type { AgendaCategory } from '@/modules/types'
import { CATEGORIES, CATEGORY_IDS } from './categories'

export function CategoryFilter({ visible, onChange }: { visible: readonly AgendaCategory[]; onChange: (visible: AgendaCategory[]) => void }) {
  return (
    <details>
      <summary className="inline-flex min-h-11 items-center font-bold underline underline-offset-4">Elegir qué se ve ({visible.length} de {CATEGORY_IDS.length})</summary>
      <fieldset className="mt-2 flex min-w-0 flex-wrap gap-2">
        <legend className="sr-only">Qué quieres ver</legend>
        {CATEGORY_IDS.map((id) => {
          const { icon: Icon, label, text, bar } = CATEGORIES[id]
          const on = visible.includes(id)
          return (
            <label key={id} className={`flex min-h-11 items-center gap-2 border-2 px-3 has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-foco ${on ? `bg-crema ${bar}` : 'border-borde text-apagado'}`}>
              <input type="checkbox" checked={on} onChange={() => onChange(on ? visible.filter((c) => c !== id) : [...visible, id])} className="size-5 accent-marino outline-none" />
              <Icon aria-hidden="true" className={`size-5 ${on ? text : ''}`} />
              {label}
            </label>
          )
        })}
      </fieldset>
    </details>
  )
}
