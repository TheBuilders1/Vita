import { Plus } from 'lucide-react'
import { useHome } from '@/app/providers/home'
import { Button } from '@/components/ui/Button'
import { useRecordEditor } from '@/features/records/editor'
import type { ModuleId } from '@/modules/types'
import { addableTypes } from '@/services/adding'

/** Para comprobar que queda a la vista al entrar. */
export const MAIN_ADD_ID = 'main-add'

/** Lo primero de cada habitación: añadir, sin tener que buscarlo. */
export function AddBar({ moduleId }: { moduleId: ModuleId }) {
  const { actor, records } = useHome()
  const editor = useRecordEditor()
  const types = addableTypes(moduleId, actor, records)
  if (types.length === 0) return null
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {types.map((type, i) => (
        <Button key={type.id} id={i === 0 ? MAIN_ADD_ID : undefined} icon={Plus} variant={i === 0 ? 'primary' : 'secondary'} size={i === 0 ? 'lg' : 'md'} className="max-[24rem]:px-3" onClick={() => editor.create(type.id)}>Añadir {type.name.toLowerCase()}</Button>
      ))}
    </div>
  )
}
