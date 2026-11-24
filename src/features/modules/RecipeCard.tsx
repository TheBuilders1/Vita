import { CircleCheck, TriangleAlert } from 'lucide-react'
import { useHome } from '@/app/providers/home'
import { useRecordEditor } from '@/features/records/editor'
import type { RecipeMatch } from '@/services/recipes'

export function RecipeCard({ match: { recipe, missing, conflicts } }: { match: RecipeMatch }) {
  const { members } = useHome()
  const editor = useRecordEditor()
  return (
    <li className="border-2 border-beige p-4">
      <button type="button" onClick={() => editor.open(recipe.id)} className="min-h-11 text-left text-lg font-bold underline underline-offset-4">{String(recipe.data.title)}</button>
      <p className="text-apagado">{String(recipe.data.minutes)} minutos</p>
      {conflicts.map((c, i) => (
        <p key={i} className={`mt-1 flex items-start gap-2 font-bold ${c.severe ? 'text-peligro' : ''}`}>
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          {members.find((m) => m.id === c.memberId)?.name ?? 'Alguien'}: {c.reason.toLowerCase()}
        </p>
      ))}
      {missing.length === 0
        ? <p className="mt-1 flex items-center gap-2"><CircleCheck aria-hidden="true" className="size-5 text-oliva" />Tenéis todo lo necesario</p>
        : <p className="mt-1">Falta: {missing.join(', ').toLowerCase()}</p>}
    </li>
  )
}
