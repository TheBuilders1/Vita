import { useHome } from '@/app/providers/home'
import { ChoicesInput } from '@/components/form/ListInputs'
import { RadioGroup } from '@/components/ui/Field'
import type { Visibility } from '@/modules/types'
import { VISIBILITY_LABELS } from './labels'

interface VisibilityInputProps { value: Visibility; sharedWith: string[]; canBePrivate: boolean; onChange: (value: Visibility, sharedWith: string[]) => void }

export function VisibilityInput({ value, sharedWith, canBePrivate, onChange }: VisibilityInputProps) {
  const { members, actor } = useHome()
  const options = (['family', 'restricted', 'private'] as const)
    .filter((v) => v !== 'private' || canBePrivate)
    .map((v) => ({ value: v, ...VISIBILITY_LABELS[v] }))
  return (
    <details className="border-2 border-beige">
      <summary className="min-h-12 px-4 py-2.5"><span className="font-bold">Quién puede verlo:</span> {VISIBILITY_LABELS[value].label}</summary>
      <div className="grid grid-cols-1 gap-4 p-4">
        <RadioGroup legend="Visibilidad" name="visibility" value={value} options={options} onChange={(v) => onChange(v as Visibility, sharedWith)} />
        {value === 'restricted' && (
          <ChoicesInput label="Compartir también con" value={sharedWith} options={members.filter((m) => m.id !== actor.id).map((m) => ({ value: m.id, label: m.name }))} onChange={(ids) => onChange(value, ids)} />
        )}
      </div>
    </details>
  )
}
