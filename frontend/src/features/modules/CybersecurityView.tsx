import { useState } from 'react'
import { useHome } from '@/app/providers/home'
import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/ui/Field'
import { repositories } from '@/database'
import { useCanCreate } from '@/features/records/RecordList'
import { useToday } from '@/hooks/useToday'
import { getRecordType } from '@/modules/registry'
import { describeError } from '@/services/errors'
import { checkContact } from '@/services/linkCheck'
import { toastStore } from '@/store'
import { Block, ModuleRecords } from './shared'

export function CybersecurityView() {
  const { actor } = useHome()
  const today = useToday()
  const canSave = useCanCreate(getRecordType('scamReport'))
  const [text, setText] = useState('')
  const [checked, setChecked] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState('')
  const result = checked ? checkContact(checked) : undefined
  const save = async () => {
    if (!result || saving) return
    setSaving(true)
    try {
      await repositories.records.create(actor.id, { typeId: 'scamReport', data: {
        title: checked.slice(0, 200), channel: result.channel, date: today, signals: result.signals, action: `Comprobado en este dispositivo: ${checked}`,
      } })
      setSaved(checked)
      toastStore.getState().show('Posible estafa guardada')
    } catch (error) { toastStore.getState().show(describeError(error), 'error') }
    finally { setSaving(false) }
  }
  return <div className="grid gap-6">
    <Block title="Comprueba un mensaje sospechoso">
      <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); setChecked(text.trim()) }}>
        <TextInput label="Enlace, teléfono o correo" help="Se comprueba en este dispositivo, sin abrir enlaces ni enviar datos." required autoComplete="off" spellCheck={false} autoCapitalize="none" maxLength={2000} value={text} onChange={(e) => { setText(e.target.value); setChecked('') }} />
        <div><Button type="submit" disabled={!text.trim()}>Comprobar</Button></div>
      </form>
      <div aria-live="polite" className="break-words">{result && <div className="mt-4 grid gap-2">
        <h4 className="font-bold">{result.signals.length ? 'Señales de alarma' : 'No vemos nada raro, pero esto no garantiza que sea seguro.'}</h4>
        {result.detail && <p>{result.detail}</p>}
        <ul className="list-disc pl-5">{result.signals.map((signal) => <li key={signal}>{signal}</li>)}</ul>
        {canSave && <div><Button disabled={saving || saved === checked} onClick={() => void save()}>{saved === checked ? 'Posible estafa guardada' : 'Guardar como posible estafa'}</Button></div>}
      </div>}</div>
      <div className="mt-3 flex flex-wrap gap-x-4">
        <a className="inline-flex min-h-11 items-center underline" href="tel:017">Llamar al 017 de INCIBE</a>
        <a className="inline-flex min-h-11 items-center underline" href="https://www.incibe.es/ciudadania/ayuda" referrerPolicy="no-referrer">Ayuda de INCIBE</a>
      </div>
    </Block>
    <ModuleRecords moduleId="cybersecurity" />
  </div>
}
