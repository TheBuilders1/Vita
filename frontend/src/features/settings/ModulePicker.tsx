import { Checkbox } from '@/components/ui/Field'
import { FLOORS } from '@/modules/floors'
import { modulesOnFloor } from '@/modules/registry'
import type { ModuleId } from '@/modules/types'
import { ALWAYS_ON } from '@/types/family'

interface ModulePickerProps { enabled: readonly ModuleId[]; reasons?: ReadonlyMap<ModuleId, string>; onChange: (enabled: ModuleId[]) => void }

export function ModulePicker({ enabled, reasons, onChange }: ModulePickerProps) {
  const toggle = (id: ModuleId, on: boolean) => onChange(on ? [...enabled, id] : enabled.filter((m) => m !== id))
  return (
    <div className="grid grid-cols-1 gap-6">
      {FLOORS.toReversed().map((floor) => (
        <fieldset key={floor.id} className="min-w-0">
          <legend className="text-lg font-bold">Planta {floor.level}: {floor.name}</legend>
          <div className="mt-1 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            {modulesOnFloor(floor.id).map((m) => {
              const fixed = ALWAYS_ON.includes(m.id)
              return (
                <Checkbox
                  key={m.id}
                  label={m.name}
                  help={fixed ? 'Siempre abierta' : reasons?.get(m.id) || m.description}
                  checked={fixed || enabled.includes(m.id)}
                  disabled={fixed}
                  onChange={(e) => toggle(m.id, e.target.checked)}
                />
              )
            })}
          </div>
        </fieldset>
      ))}
    </div>
  )
}
