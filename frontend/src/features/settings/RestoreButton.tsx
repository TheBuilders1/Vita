import { Upload } from 'lucide-react'
import { useId, useState } from 'react'
import { ConfirmDialog } from '@/components/ui/Dialog'
import { repositories } from '@/database'
import { describeError } from '@/services/errors'
import { toastStore } from '@/store'

/** Sin familia (actorId null) no hay nada que sustituir y se restaura directamente. */
export function RestoreButton({ actorId }: { actorId: string | null }) {
  const id = useId()
  const [file, setFile] = useState<File>()
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  const restore = async (chosen: File) => {
    setBusy(true)
    try {
      await repositories.backup.restore(actorId, await chosen.text())
      setFile(undefined)
      toastStore.getState().show('Copia restaurada')
    } catch (cause) {
      if (actorId) setError(describeError(cause))
      else toastStore.getState().show(describeError(cause), 'error')
    }
    setBusy(false)
  }
  const choose = (chosen: File | undefined) => {
    if (!chosen) return
    setError(undefined)
    if (actorId) setFile(chosen)
    else void restore(chosen)
  }
  return (
    <>
      <label htmlFor={id} className="pixel-edge inline-flex min-h-12 items-center gap-2.5 bg-crema px-5 py-2 font-bold has-focus-visible:outline-3 has-focus-visible:outline-offset-4 has-focus-visible:outline-foco">
        <Upload aria-hidden="true" className="size-5" />Restaurar una copia
        <input id={id} type="file" accept="application/json,.json" disabled={busy} className="sr-only" onChange={(e) => { choose(e.target.files?.[0]); e.target.value = '' }} />
      </label>
      <ConfirmDialog open={file !== undefined} title="Restaurar una copia" confirmLabel="Sustituir por la copia" busy={busy} error={error} onClose={() => setFile(undefined)} onConfirm={() => { if (file) void restore(file) }}>
        <p>Todo lo que hay ahora en Vita se sustituirá por el contenido de «{file?.name}». Si quieres conservarlo, guarda antes una copia.</p>
      </ConfirmDialog>
    </>
  )
}
