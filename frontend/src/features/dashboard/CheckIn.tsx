import { Check, LifeBuoy, Phone } from 'lucide-react'
import { useState } from 'react'
import { useStore } from 'zustand'
import { useHome } from '@/app/providers/home'
import { Button } from '@/components/ui/Button'
import { useToday } from '@/hooks/useToday'
import { settingsStore } from '@/store'
import { telLink } from '@/utils/links'

const key = (actorId: string) => `vita-checkin-${actorId}`
// Solo recuerda que hoy ya se respondió, en este navegador: si falla el almacenamiento, se vuelve a preguntar.
const read = (actorId: string) => { try { return localStorage.getItem(key(actorId)) } catch { return null } }
const write = (actorId: string, day: string) => { try { localStorage.setItem(key(actorId), day) } catch { /* sin almacenamiento: no pasa nada */ } }

/** «¿Todo bien hoy?» para quien vive solo o usa la vista sencilla. Vita no avisa a nadie: deja a mano a quién llamar. */
export function CheckIn() {
  const { actor, records } = useHome()
  const today = useToday()
  const emergencyNumber = useStore(settingsStore, (s) => s.settings.emergencyNumber)
  const [answered, setAnswered] = useState(() => read(actor.id) === today)
  const [help, setHelp] = useState(false)
  const contacts = records.filter((r) => r.typeId === 'emergencyContact').toSorted((a, b) => Number(a.data.priority ?? 99) - Number(b.data.priority ?? 99))
  if (answered && !help) return null
  return (
    <section aria-labelledby="checkin-title" className="pixel-edge mb-4 grid gap-3 bg-exito-fondo p-4">
      <h2 id="checkin-title" className="text-xl font-bold">¿Todo bien hoy, {actor.name}?</h2>
      {!help && (
        <div className="flex flex-wrap gap-2">
          <Button variant="confirm" icon={Check} onClick={() => { write(actor.id, today); setAnswered(true) }}>Sí, todo bien</Button>
          <Button icon={LifeBuoy} onClick={() => setHelp(true)}>Necesito ayuda</Button>
        </div>
      )}
      {help && (
        <>
          <p>Vita no avisa a nadie por sí sola. Llama tú a quien prefieras:</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {contacts.map((c) => <a key={c.id} href={telLink(String(c.data.phone))} className="pixel-edge flex min-h-14 items-center gap-3 bg-crema px-4 font-bold"><Phone aria-hidden="true" className="size-6" />{String(c.data.name)}</a>)}
            <a href={telLink(emergencyNumber)} className="pixel-edge flex min-h-14 items-center gap-3 bg-peligro px-4 font-bold text-crema [--edge:var(--color-peligro-hondo)]"><Phone aria-hidden="true" className="size-6" />Emergencias, {emergencyNumber}</a>
          </div>
          {contacts.length === 0 && <p>Todavía no hay contactos de emergencia. Apunta al menos uno en Emergencias.</p>}
          <div><Button onClick={() => { write(actor.id, today); setAnswered(true); setHelp(false) }}>Ya estoy bien</Button></div>
        </>
      )}
    </section>
  )
}
