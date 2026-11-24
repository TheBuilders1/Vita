import { useStore } from 'zustand'
import { RadioGroup } from '@/components/ui/Field'
import { Notice } from '@/components/ui/Notice'
import { Panel } from '@/components/ui/Panel'
import type { Settings } from '@/database/repositories/settings'
import { canDictate } from '@/hooks/useDictation'
import { describeError } from '@/services/errors'
import { settingsStore, toastStore } from '@/store'

const OPTIONS = [
  { value: 'off', label: 'No dictar' },
  { value: 'device', label: 'Solo en este dispositivo', hint: 'La voz no sale de él. No todos los navegadores pueden.' },
  { value: 'any', label: 'También con el servicio del navegador', hint: 'La voz puede salir de este dispositivo.' },
]
const change = (dictation: string) => {
  settingsStore.getState().update({ dictation: dictation as Settings['dictation'] }).catch((e: unknown) => toastStore.getState().show(describeError(e), 'error'))
}

/** Aquí no se pregunta nada al motor de voz: en algunos navegadores esa consulta cierra la pestaña. Se hace al pulsar «Dictar». */
export function DictationPanel() {
  const mode = useStore(settingsStore, (s) => s.settings.dictation)
  if (!canDictate()) return null
  return (
    <Panel title="Dictar en vez de escribir">
      <div className="grid grid-cols-1 gap-3">
        <p>Verás un botón «Dictar» donde se escribe a Vita. Solo escucha cuando lo pulsas, y nada se guarda sin que lo confirmes.</p>
        <RadioGroup legend="Dictado" name="dictation" value={mode} options={OPTIONS} onChange={change} />
        {mode === 'any' && <Notice tone="warning">Para convertir la voz en texto, tu navegador puede enviarla a la empresa que lo hace (por ejemplo, Google o Apple). Vita no la recibe ni la guarda, pero no puede evitar ese envío.</Notice>}
      </div>
    </Panel>
  )
}
