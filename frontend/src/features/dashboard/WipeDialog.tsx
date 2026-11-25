import { useState } from 'react'
import { useHome } from '@/app/providers/home'
import { ConfirmDialog } from '@/components/ui/Dialog'
import { repositories } from '@/database'
import { describeError } from '@/services/errors'
import { navigationStore, toastStore } from '@/store'
import type { Entry } from '@/store/navigationStore'

interface WipeDialogProps { open: boolean; title: string; confirmLabel: string; onClose: () => void; destination: Entry; children: string }

/** Único camino para borrar la familia. Al terminar, AppLayout lleva a la bienvenida. */
export function WipeDialog({ open, title, confirmLabel, onClose, destination, children }: WipeDialogProps) {
  const { actor } = useHome()
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  const wipe = async () => {
    setBusy(true)
    try {
      navigationStore.getState().setEntry(destination)
      toastStore.getState().clear()
      await repositories.family.wipe(actor.id)
      toastStore.getState().show('Se han borrado todos los datos')
    } catch (cause) {
      setError(describeError(cause))
      setBusy(false)
    }
  }
  return (
    <ConfirmDialog open={open} onClose={onClose} title={title} confirmLabel={confirmLabel} busy={busy} error={error} onConfirm={() => { void wipe() }}>
      <p>{children}</p>
    </ConfirmDialog>
  )
}
