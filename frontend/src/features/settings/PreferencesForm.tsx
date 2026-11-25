import { useStore } from 'zustand'
import { RadioGroup } from '@/components/ui/Field'
import type { Settings } from '@/database/repositories/settings'
import { describeError } from '@/services/errors'
import { settingsStore, toastStore } from '@/store'

const change = (changes: Partial<Settings>) => {
  settingsStore.getState().update(changes).then(() => toastStore.getState().show('Preferencia guardada')).catch((error: unknown) => toastStore.getState().show(describeError(error), 'error'))
}

/** Se aplica y se guarda al momento: no hace falta un botón de guardar. */
export function PreferencesForm() {
  const settings = useStore(settingsStore, (s) => s.settings)
  return (
    <div className="grid grid-cols-1 gap-5">
      <RadioGroup legend="Tamaño del texto" name="textSize" value={settings.textSize} onChange={(v) => change({ textSize: v as Settings['textSize'] })}
        options={[{ value: 'normal', label: 'Normal' }, { value: 'large', label: 'Grande' }, { value: 'xlarge', label: 'Muy grande' }]} />
      <RadioGroup legend="Contraste" name="contrast" value={settings.contrast} onChange={(v) => change({ contrast: v as Settings['contrast'] })}
        options={[{ value: 'normal', label: 'Normal' }, { value: 'high', label: 'Alto' }]} />
      <RadioGroup legend="Edificio" name="building" value={settings.building} onChange={(v) => change({ building: v as Settings['building'] })}
        options={[{ value: '3d', label: 'En 3D' }, { value: 'simple', label: 'Vista sencilla' }]} />
      <RadioGroup legend="Movimiento" name="motion" value={settings.motion} onChange={(v) => change({ motion: v as Settings['motion'] })}
        options={[{ value: 'system', label: 'Como el sistema' }, { value: 'reduced', label: 'Reducido' }]} />
    </div>
  )
}
