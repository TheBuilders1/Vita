import { useState } from 'react'
import { useStore } from 'zustand'
import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/ui/Field'
import { Notice } from '@/components/ui/Notice'
import { MAX_EMERGENCY_CONTACTS, type Settings } from '@/database/repositories/settings'
import { describeError } from '@/services/errors'
import { settingsStore, toastStore } from '@/store'

const suggestions = [
  { name: 'Policía Nacional', number: '091' },
  { name: 'Guardia Civil', number: '062' },
  { name: 'Bomberos', number: '080' },
  { name: 'Urgencias sanitarias', number: '061' },
  { name: 'Información toxicológica', number: '915 620 420' },
  { name: 'Violencia de género', number: '016' },
]

export function EmergencyContacts() {
  const contacts = useStore(settingsStore, (s) => s.settings.emergencyContacts)
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const full = contacts.length >= MAX_EMERGENCY_CONTACTS

  const save = async (emergencyContacts: Settings['emergencyContacts'], message: string) => {
    setBusy(true)
    setError(undefined)
    try {
      await settingsStore.getState().update({ emergencyContacts })
      toastStore.getState().show(message)
      return true
    } catch (cause) {
      setError(describeError(cause))
      return false
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-6 grid min-w-0 grid-cols-1 gap-3">
      <h3 className="text-lg font-bold">Otros números de emergencia</h3>
      <p>Puedes añadir hasta ocho números para llamar desde Emergencias y desde la vista sencilla.</p>
      {contacts.length > 0 && <ul className="grid gap-2">{contacts.map((contact, index) => (
        <li key={index} className="flex flex-wrap items-center justify-between gap-2 border-b border-beige py-2 [overflow-wrap:anywhere]">
          <span><strong>{contact.name}</strong> · {contact.number}</span>
          <Button size="sm" disabled={busy} onClick={() => { void save(contacts.filter((_, i) => i !== index), 'Número quitado') }}>Quitar<span className="sr-only"> {contact.name}</span></Button>
        </li>
      ))}</ul>}
      {!full && <>
        <fieldset disabled={busy} className="min-w-0">
          <legend className="font-bold">Añadir un servicio de España</legend>
          <div className="mt-2 flex flex-wrap gap-2">{suggestions.map((contact) => (
            <Button key={contact.number} size="sm" disabled={contacts.some((c) => c.number === contact.number)}
              onClick={() => { void save([...contacts, contact], 'Número añadido') }}>{contact.name} · {contact.number}</Button>
          ))}</div>
        </fieldset>
        <form className="grid grid-cols-1 gap-3" onSubmit={(e) => {
          e.preventDefault()
          void save([...contacts, { name: name.trim(), number: number.trim() }], 'Número añadido').then((saved) => {
            if (saved) { setName(''); setNumber('') }
          })
        }}>
          <TextInput label="Nombre del servicio o de la persona" required maxLength={80} disabled={busy} value={name} onChange={(e) => setName(e.target.value)} />
          <TextInput label="Número de teléfono" type="tel" required disabled={busy} value={number} onChange={(e) => setNumber(e.target.value)} />
          <div><Button type="submit" disabled={busy}>Añadir número</Button></div>
        </form>
      </>}
      {error && <div role="alert"><Notice tone="error">{error}</Notice></div>}
    </section>
  )
}
