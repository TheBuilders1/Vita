import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Panel } from '@/components/ui/Panel'
import { toastStore } from '@/store'
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
        <p>Todo se guarda en este navegador, sin cifrar. Nada se envía a ningún servidor.</p>
        <p>Los datos se pierden si borras los datos de navegación, usas una ventana privada o cambias de dispositivo.</p>
        {storage?.usage !== undefined && <p>Espacio usado por Vita: <strong>{formatBytes(storage.usage)}</strong></p>}
        {storage && (storage.persisted
          ? <p>El navegador se ha comprometido a no borrar estos datos por falta de espacio.</p>
          : <div><Button onClick={() => { void protect() }}>Pedir al navegador que los conserve</Button></div>)}
      </div>
    </Panel>
  )
}
