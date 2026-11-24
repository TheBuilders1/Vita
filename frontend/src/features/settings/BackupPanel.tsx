import { useLiveQuery } from 'dexie-react-hooks'
import { Download } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useHome } from '@/app/providers/home'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Checkbox, RadioGroup, TextInput } from '@/components/ui/Field'
import { Notice } from '@/components/ui/Notice'
import { Panel } from '@/components/ui/Panel'
import { repositories } from '@/database'
import { canEncrypt, encryptText, MIN_PASSWORD, passwordProblem } from '@/services/cipher'
import { describeError } from '@/services/errors'
import { toastStore } from '@/store'
import { todayIso } from '@/utils/dates'
import { formatDate } from '@/utils/format'
import { RestoreButton } from './RestoreButton'

const CHOICES = [
  { value: 'locked', label: 'Con contraseña', hint: 'Solo se abre con ella. Recomendado.' },
  { value: 'open', label: 'Sin contraseña', hint: 'Quien tenga el archivo puede leerlo.' },
]

export function BackupPanel() {
  const { actor } = useHome()
  const [saving, setSaving] = useState(false)
  const last = useLiveQuery(() => repositories.backup.lastExport(), [])
  return (
    <div id="copias" className="scroll-mt-4">
      <Panel title="Copias de seguridad">
        <p className="mb-4">{last ? `Última copia: ${formatDate(last)}.` : 'Todavía no has hecho ninguna copia.'} Incluye el hogar, los registros y los archivos, también lo privado de cada persona.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" icon={Download} onClick={() => setSaving(true)}>Guardar una copia</Button>
          <RestoreButton actorId={actor.id} />
        </div>
      </Panel>
      {saving && <SaveDialog onClose={() => setSaving(false)} />}
    </div>
  )
}

function SaveDialog({ onClose }: { onClose: () => void }) {
  const { actor } = useHome()
  const [kind, setKind] = useState(canEncrypt() ? 'locked' : 'open')
  const [password, setPassword] = useState('')
  const [repeated, setRepeated] = useState('')
  const [visible, setVisible] = useState(false)
  const [problem, setProblem] = useState<string>()
  const [failure, setFailure] = useState<string>()
  const [busy, setBusy] = useState(false)
  const locked = kind === 'locked'

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    const wrong = locked ? passwordProblem(password, repeated) : undefined
    setProblem(wrong)
    setFailure(undefined)
    if (wrong) return
    setBusy(true)
    try {
      const text = JSON.stringify(await repositories.backup.export(actor.id))
      const content = locked ? await encryptText(text, password) : text
      const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }))
      Object.assign(document.createElement('a'), { href: url, download: `vita-copia${locked ? '-cifrada' : ''}-${todayIso()}.json` }).click()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
      toastStore.getState().show(locked ? 'Copia cifrada preparada. Guarda bien la contraseña.' : 'Copia preparada para descargar')
      onClose()
    } catch (error) {
      setFailure(describeError(error))
      setBusy(false)
    }
  }
  return (
    <Dialog open onClose={onClose} title="Guardar una copia" error={failure} footer={<><Button onClick={onClose}>Cancelar</Button><Button type="submit" form="backup-form" variant="primary" icon={Download} disabled={busy}>{busy ? 'Preparando…' : 'Guardar copia'}</Button></>}>
      <form id="backup-form" noValidate onSubmit={(e) => { void save(e) }} className="grid grid-cols-1 gap-5">
        {canEncrypt()
          ? <RadioGroup legend="Cómo guardarla" name="backup-kind" value={kind} options={CHOICES} onChange={setKind} />
          : <Notice>Para ponerle contraseña, abre Vita con una dirección segura (https).</Notice>}
        {locked ? (
          <>
            <Notice tone="warning">Apúntala en un lugar seguro. Vita no la guarda: si se pierde, nadie puede abrir esta copia.</Notice>
            <TextInput label="Contraseña" type={visible ? 'text' : 'password'} required autoComplete="new-password" autoCapitalize="none" spellCheck={false} help={`Al menos ${MIN_PASSWORD} letras. Tres o cuatro palabras sueltas son fáciles de recordar.`} error={problem} value={password} onChange={(e) => setPassword(e.target.value)} />
            <TextInput label="Otra vez" type={visible ? 'text' : 'password'} required autoComplete="new-password" autoCapitalize="none" spellCheck={false} value={repeated} onChange={(e) => setRepeated(e.target.value)} />
            <Checkbox label="Ver lo que escribo" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
          </>
        ) : <Notice tone="warning">El archivo no va cifrado y contiene también lo privado de cada persona. Guárdalo en un lugar seguro.</Notice>}
      </form>
    </Dialog>
  )
}
