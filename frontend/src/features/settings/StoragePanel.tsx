import { useEffect, useState } from 'react'
import { useStore } from 'zustand'
import { Button } from '@/components/ui/Button'
import { Panel } from '@/components/ui/Panel'
import { SERVER_HOUSEHOLD } from '@/services/homeServer'
import { settingsStore, toastStore } from '@/store'
import { formatBytes } from '@/utils/format'

interface Storage { usage: number | undefined; persisted: boolean }

async function inspect(): Promise<Storage> {
  // Solo existe en HTTPS o localhost.
  const manager = navigator.storage as StorageManager | undefined
  const [estimate, persisted] = await Promise.all([manager?.estimate(), manager?.persisted()])
  return { usage: estimate?.usage, persisted: persisted ?? false }
}

export function StoragePanel() {
  const [storage, setStorage] = useState<Storage>()
  const dictates = useStore(settingsStore, (s) => s.settings.dictation === 'any')
  const chat = useStore(settingsStore, s => s.settings.connectedChat) && SERVER_HOUSEHOLD !== null
  const sends = useStore(settingsStore, (s) => s.settings.photoReading) && SERVER_HOUSEHOLD !== null
  useEffect(() => { inspect().then(setStorage).catch(() => setStorage({ usage: undefined, persisted: false })) }, [])

  const protect = async () => {
    const granted = await (navigator.storage as StorageManager | undefined)?.persist()
    if (storage) setStorage({ ...storage, persisted: granted ?? false })
    const { show } = toastStore.getState()
    if (granted) show('El navegador no borrará los datos por falta de espacio')
    else show('El navegador no lo ha permitido. Suele aceptarlo tras usar Vita unos días.', 'error')
  }
  return (
    <Panel title="Privacidad y almacenamiento">
      <div className="grid grid-cols-1 gap-3">
        <p>Todo se guarda en este navegador, sin cifrar. {sends && 'Al servidor de tu hogar van las fotos de documentos que mandes leer.'}{chat && ' Con Vita conectada, el chat va al asistente del servidor. Puedes ver qué se envía en el ajuste «Vita conectada».'}{!sends && !chat && 'Vita no envía nada a ningún servidor.'}{dictates && ' Si dictas, tu navegador puede enviar la voz a su fabricante.'}</p>
        <p>Los datos se pierden si borras los datos de navegación, usas una ventana privada o cambias de dispositivo.</p>
        {storage?.usage !== undefined && <p>Espacio usado por Vita: <strong>{formatBytes(storage.usage)}</strong></p>}
        {storage && (storage.persisted
          ? <p>El navegador se ha comprometido a no borrar estos datos por falta de espacio.</p>
          : <div><Button onClick={() => { void protect() }}>Pedir al navegador que los conserve</Button></div>)}
      </div>
    </Panel>
  )
}
