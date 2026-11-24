import { useLiveQuery } from 'dexie-react-hooks'
import { Download } from 'lucide-react'
import { useState } from 'react'
import { useHome } from '@/app/providers/home'
import { Button } from '@/components/ui/Button'
import { Notice } from '@/components/ui/Notice'
import { Panel } from '@/components/ui/Panel'
import { repositories } from '@/database'
import { describeError } from '@/services/errors'
import { toastStore } from '@/store'
import { todayIso } from '@/utils/dates'
import { formatDate } from '@/utils/format'
import { RestoreButton } from './RestoreButton'

export function BackupPanel() {
  const { actor } = useHome()
  const [busy, setBusy] = useState(false)
  const last = useLiveQuery(() => repositories.backup.lastExport(), [])

  const download = async () => {
    setBusy(true)
    try {
      const backup = await repositories.backup.export(actor.id)
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup)], { type: 'application/json' }))
      Object.assign(document.createElement('a'), { href: url, download: `vita-copia-${todayIso()}.json` }).click()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
      toastStore.getState().show('Copia preparada para descargar')
    } catch (error) {
      toastStore.getState().show(describeError(error), 'error')
    }
    setBusy(false)
  }
  return (
    <div id="copias" className="scroll-mt-4">
      <Panel title="Copias de seguridad">
        <p>{last ? `Última copia: ${formatDate(last)}.` : 'Todavía no has hecho ninguna copia.'} Incluye el hogar, los registros y los archivos.</p>
        <div className="my-4"><Notice tone="warning">El archivo no va cifrado y contiene también lo privado de cada persona. Guárdalo en un lugar seguro.</Notice></div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" icon={Download} disabled={busy} onClick={() => { void download() }}>{busy ? 'Preparando…' : 'Guardar una copia'}</Button>
          <RestoreButton actorId={actor.id} />
        </div>
      </Panel>
    </div>
  )
}
