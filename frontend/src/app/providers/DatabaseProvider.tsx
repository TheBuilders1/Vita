import { useEffect, useState, type ReactNode } from 'react'
import { db, repositories } from '@/database'
import { settingsStore } from '@/store'
import { MessagePage } from '../MessagePage'

type Status = 'opening' | 'ready' | 'failed'

/** Abre el almacenamiento local antes de mostrar la app; si no se puede, lo explica. */
export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('opening')

  useEffect(() => {
    let active = true
    db.open()
      .then(() => Promise.all([settingsStore.getState().load(), repositories.files.purgeAbandoned()]))
      .then(() => { if (active) setStatus('ready') })
      .catch((error: unknown) => {
        console.error('No se ha podido abrir IndexedDB', error)
        if (active) setStatus('failed')
      })
    return () => { active = false }
  }, [])

  if (status === 'ready') return children
  if (status === 'opening') return <output className="block p-8">Abriendo Vita…</output>
  return (
    <MessagePage title="No podemos abrir Vita">
      Este navegador no permite guardar datos locales o los tiene bloqueados. Comprueba que no estás en una ventana
      privada y que queda espacio, y vuelve a cargar la página.
    </MessagePage>
  )
}
