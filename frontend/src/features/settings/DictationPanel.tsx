import { useEffect, useState } from 'react'
import { useStore } from 'zustand'
import { Checkbox } from '@/components/ui/Field'
import { Notice } from '@/components/ui/Notice'
import { Panel } from '@/components/ui/Panel'
import type { Settings } from '@/database/repositories/settings'
import { canDictate, dictatesLocally } from '@/hooks/useDictation'
import { describeError } from '@/services/errors'
import { settingsStore, toastStore } from '@/store'

const change = (dictation: Settings['dictation']) => {
  settingsStore.getState().update({ dictation }).catch((e: unknown) => toastStore.getState().show(describeError(e), 'error'))
}

/** Solo aparece si el navegador sabe hacerlo. Apagado: casi siempre la voz sale del dispositivo. */
export function DictationPanel() {
  const mode = useStore(settingsStore, (s) => s.settings.dictation)
  const [local, setLocal] = useState(false)
  useEffect(() => { void dictatesLocally().then(setLocal) }, [])
  if (!canDictate()) return null
  return (
    <Panel title="Dictar en vez de escribir">
      {local
        ? <p className="mb-3">Este navegador convierte la voz en texto en el propio dispositivo: no sale de él.</p>
        : <div className="mb-3"><Notice tone="warning">Para convertir la voz en texto, este navegador puede enviarla a la empresa que lo hace (por ejemplo, Google o Apple). Vita no la recibe ni la guarda, pero no puede evitar ese envío.</Notice></div>}
      <Checkbox label="Permitir dictar a Vita" help="Verás un botón «Dictar» donde se escribe a Vita. Solo escucha cuando lo pulsas, y nada se guarda sin que lo confirmes." checked={mode === 'any' || (mode === 'device' && local)} onChange={(e) => change(!e.target.checked ? 'off' : local ? 'device' : 'any')} />
    </Panel>
  )
}
