import { useHome } from '@/app/providers/home'
import { Dialog } from '@/components/ui/Dialog'
import { ModuleIcon } from '@/components/ui/ModuleIcon'
import { useRecordEditor } from '@/features/records/editor'
import { getModule, getRecordType } from '@/modules/registry'
import { accessTo } from '@/services/permissions'

/** Lo que se apunta con más frecuencia y el campo que recibe la fecha elegida. */
const QUICK = [['task', 'dueDate'], ['event', 'date'], ['appointment', 'date'], ['dentalVisit', 'date'], ['schoolEvent', 'date'], ['outing', 'date'], ['transaction', 'date'], ['document', 'expiryDate']] as const

export function AddDialog({ open, date, onClose }: { open: boolean; date?: string; onClose: () => void }) {
  const { actor, family } = useHome()
  const editor = useRecordEditor()
  const options = QUICK.map(([typeId, dateField]) => ({ type: getRecordType(typeId), dateField }))
    .filter(({ type }) => family.enabledModules.includes(type.moduleId) && accessTo(actor, type.moduleId) === 'write')
  return (
    <Dialog open={open} onClose={onClose} title="¿Qué quieres apuntar?">
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map(({ type, dateField }) => (
          <li key={type.id}>
            <button type="button" onClick={() => { onClose(); editor.create(type.id, date ? { [dateField]: date } : {}) }} className="flex min-h-16 w-full items-center gap-3 border-2 border-borde px-4 py-2 text-left hover:bg-yeso">
              <ModuleIcon id={type.moduleId} className="size-7" />
              <span><span className="block font-bold">{type.name}</span><span className="text-apagado">{getModule(type.moduleId).name}</span></span>
            </button>
          </li>
        ))}
      </ul>
    </Dialog>
  )
}
