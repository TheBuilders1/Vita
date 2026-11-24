import { Upload } from 'lucide-react'
import { useId, useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog, Dialog } from '@/components/ui/Dialog'
import { Checkbox, TextInput } from '@/components/ui/Field'
import { repositories } from '@/database'
import { decryptText, isEncrypted } from '@/services/cipher'
import { describeError } from '@/services/errors'
import { toastStore } from '@/store'

/** Copia elegida. Con `plain`, ya se ha podido leer; sin él, falta su contraseña. */
interface Chosen { name: string; text: string; plain?: string }

/** Sin hogar (actorId null) no hay nada que sustituir y se restaura directamente. */
export function RestoreButton({ actorId }: { actorId: string | null }) {
  const id = useId()
  const [chosen, setChosen] = useState<Chosen>()
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  /** Cancelar invalida lo que esté en marcha. */
  const turn = useRef(0)

  const restore = async (plain: string, inDialog: boolean) => {
    setBusy(true)
    try {
      await repositories.backup.restore(actorId, plain)
      setChosen(undefined)
      toastStore.getState().show('Copia restaurada')
    } catch (cause) {
      if (inDialog) setError(describeError(cause))
      else toastStore.getState().show(describeError(cause), 'error')
    }
    setBusy(false)
  }
  const choose = async (file: File | undefined) => {
    if (!file) return
    setError(undefined)
    const text = await file.text()
    if (isEncrypted(text)) setChosen({ name: file.name, text })
    else if (actorId) setChosen({ name: file.name, text, plain: text })
    else await restore(text, false)
  }
  const unlock = async (password: string) => {
    if (!chosen || busy) return
    setError(undefined)
    setBusy(true)
    const own = turn.current
    try {
      const plain = await decryptText(chosen.text, password)
      if (turn.current !== own) return
      if (actorId) { setChosen({ ...chosen, plain }); setBusy(false) } else await restore(plain, true)
    } catch (cause) {
      if (turn.current !== own) return
      setError(describeError(cause))
      setBusy(false)
    }
  }
  const close = () => { turn.current++; setBusy(false); setChosen(undefined); setError(undefined) }
  return (
    <>
      <label htmlFor={id} className="pixel-edge inline-flex min-h-12 items-center gap-2.5 bg-crema px-5 py-2 font-bold has-focus-visible:outline-3 has-focus-visible:outline-offset-4 has-focus-visible:outline-foco">
        <Upload aria-hidden="true" className="size-5" />Restaurar una copia
        <input id={id} type="file" accept="application/json,.json" disabled={busy} className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; void choose(file) }} />
      </label>
      {chosen && chosen.plain === undefined && <PasswordDialog name={chosen.name} busy={busy} error={error} onClose={close} onSubmit={(p) => { void unlock(p) }} />}
      {chosen?.plain !== undefined && (
        <ConfirmDialog open title="Restaurar una copia" confirmLabel="Sustituir por la copia" busy={busy} error={error} onClose={close} onConfirm={() => { if (chosen.plain !== undefined) void restore(chosen.plain, true) }}>
          <p>Todo lo que hay ahora en Vita se sustituirá por el contenido de «{chosen.name}». Si quieres conservarlo, guarda antes una copia.</p>
        </ConfirmDialog>
      )}
    </>
  )
}

function PasswordDialog({ name, busy, error, onClose, onSubmit }: { name: string; busy: boolean; error: string | undefined; onClose: () => void; onSubmit: (password: string) => void }) {
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  return (
    <Dialog open onClose={onClose} title="Abrir una copia con contraseña" error={error} footer={<><Button onClick={onClose}>Cancelar</Button><Button type="submit" form="unlock-form" variant="primary" disabled={busy}>{busy ? 'Abriendo…' : 'Abrir la copia'}</Button></>}>
      <form id="unlock-form" noValidate onSubmit={(e: FormEvent) => { e.preventDefault(); onSubmit(password) }} className="grid grid-cols-1 gap-5">
        <p className="[overflow-wrap:anywhere]">«{name}» está protegida. Escribe la contraseña que pusiste al guardarla.</p>
        <TextInput label="Contraseña" type={visible ? 'text' : 'password'} required autoComplete="current-password" autoCapitalize="none" spellCheck={false} value={password} onChange={(e) => setPassword(e.target.value)} />
        <Checkbox label="Ver lo que escribo" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
      </form>
    </Dialog>
  )
}
