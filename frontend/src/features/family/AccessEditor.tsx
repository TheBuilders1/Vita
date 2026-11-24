import { useHome } from '@/app/providers/home'
import { SelectInput } from '@/components/ui/Field'
import { repositories } from '@/database'
import { FLOORS } from '@/modules/floors'
import { modulesOnFloor } from '@/modules/registry'
import type { Access, ModuleDef, ModuleId } from '@/modules/types'
import { describeError } from '@/services/errors'
import { toastStore } from '@/store'
import type { Member } from '@/types/family'
import { ACCESS_LABELS } from './labels'

const DEFAULT = 'default'

/** Ajuste por habitación. Se guarda al elegir. */
export function AccessEditor({ member }: { member: Member }) {
  const { actor, family } = useHome()
  const change = (id: ModuleId, value: string) => {
    const moduleAccess = { ...member.moduleAccess }
    if (value === DEFAULT) delete moduleAccess[id]
    else moduleAccess[id] = value as Access
    const { show } = toastStore.getState()
    repositories.family.updateMember(actor.id, member.id, { moduleAccess })
      .then(() => show('Permiso guardado'))
      .catch((error: unknown) => show(describeError(error), 'error'))
  }
  return (
    <div className="grid grid-cols-1 gap-3">
      <p>Por defecto depende de su rol. Los registros privados o restringidos siguen siéndolo.</p>
      {FLOORS.map((floor) => (
        <details key={floor.id} className="border-2 border-beige">
          <summary className="min-h-12 px-4 py-2.5 font-bold">Planta {floor.level}: {floor.name}</summary>
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
            {modulesOnFloor(floor.id).filter((m) => family.enabledModules.includes(m.id)).map((m) => (
              <SelectInput key={m.id} label={m.name} required empty={null} value={member.moduleAccess[m.id] ?? DEFAULT} options={choices(m, member)} onChange={(e) => change(m.id, e.target.value)} />
            ))}
          </div>
        </details>
      ))}
    </div>
  )
}

function choices(module: ModuleDef, member: Member) {
  const byRole = member.role === 'master' ? 'write' : module.access[member.role]
  const levels = (['none', 'read', 'write'] as const).filter((a) => a !== 'none' || module.minimumAccess === 'none')
  return [{ value: DEFAULT, label: `Según su rol: ${ACCESS_LABELS[byRole].toLowerCase()}` }, ...levels.map((a) => ({ value: a, label: ACCESS_LABELS[a] }))]
}
