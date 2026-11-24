import { useStore } from 'zustand'
import { Checkbox } from '@/components/ui/Field'
import { Panel } from '@/components/ui/Panel'
import { describeError } from '@/services/errors'
import { settingsStore, toastStore } from '@/store'

const change = (photoReading: boolean) => {
  settingsStore.getState().update({ photoReading }).catch((e: unknown) => toastStore.getState().show(describeError(e), 'error'))
}

/** Solo aparece si este equipo tiene configurado un servidor del hogar. */
export function ServerPanel() {
  const on = useStore(settingsStore, (s) => s.settings.photoReading)
  return (
    <Panel title="Leer fotos de documentos">
      <p className="mb-3">Vita puede proponer la caducidad de un documento a partir de su foto. Para eso la envía al servidor de tu hogar, siempre con tu permiso en cada foto. Lo demás sigue en este navegador.</p>
      <Checkbox label="Permitir leer fotos en el servidor del hogar" help="La fecha se te enseña para que la confirmes o la corrijas." checked={on} onChange={(e) => change(e.target.checked)} />
    </Panel>
  )
}
