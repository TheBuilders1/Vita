import { useStore } from 'zustand'
import { Checkbox } from '@/components/ui/Field'
import { Panel } from '@/components/ui/Panel'
import { describeError } from '@/services/errors'
import { settingsStore, toastStore } from '@/store'

const change = (photoReading: boolean) => {
  settingsStore.getState().update({ photoReading }).then(() => toastStore.getState().show('Permiso para leer fotos guardado')).catch((e: unknown) => toastStore.getState().show(describeError(e), 'error'))
}

/** Solo aparece si este equipo tiene configurado un servidor del hogar. */
export function ServerPanel() {
  const on = useStore(settingsStore, (s) => s.settings.photoReading)
  const connected = useStore(settingsStore, s => s.settings.connectedChat)
  return (
    <>
      <Panel title="Leer fotos de documentos">
        <p className="mb-3">Vita puede proponer la caducidad de un documento a partir de su foto. Para eso la envía al servidor de tu hogar, siempre con tu permiso en cada foto.</p>
        <Checkbox label="Permitir leer fotos en el servidor del hogar" help="La fecha se te enseña para que la confirmes o la corrijas." checked={on} onChange={(e) => change(e.target.checked)} />
      </Panel>
      <Panel title="Vita conectada">
        <Checkbox label="Consultar al asistente del servidor" checked={connected} onChange={e => {
          settingsStore.getState().update({ connectedChat: e.target.checked }).then(() => toastStore.getState().show('Preferencia guardada')).catch((cause: unknown) => toastStore.getState().show(describeError(cause), 'error'))
        }} help="Si Vita no entiende tu mensaje, enviará la pregunta y los datos visibles necesarios al servidor; OpenClaw puede conservar texto de la conversación. Los adjuntos se leen en el servidor, pero solo si marcas análisis visual una imagen puede enviarse a Ollama Cloud. Evita incluir datos privados." />
      </Panel>
    </>
  )
}
