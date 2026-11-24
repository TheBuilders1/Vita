import { Send, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useStore } from 'zustand'
import { useHome } from '@/app/providers/home'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/ui/Field'
import { useTitle } from '@/hooks/useTitle'
import { useToday } from '@/hooks/useToday'
import { answer, MAX_MESSAGE } from '@/services/chat'
import { SERVER_HOUSEHOLD } from '@/services/homeServer'
import { chatStore, settingsStore } from '@/store'
import { isHiddenBelow } from '@/utils/reveal'
import { ReplyView } from './ReplyView'

const SUGGESTIONS = ['¿Qué tengo esta semana?', '¿Qué documentos caducan?', 'Compra leche y pan', 'Apunta dentista para mí el lunes a las 10']

/** Conversación por escrito. Las respuestas salen de reglas en este dispositivo: nada se envía. */
export function ChatPage() {
  const { actor, members, records, family } = useHome()
  const today = useToday()
  const { emergencyNumber, photoReading } = useStore(settingsStore, (s) => s.settings)
  const turns = useStore(chatStore, (s) => (s.actorId === actor.id ? s.turns : NONE))
  const [text, setText] = useState('')
  const form = useRef<HTMLFormElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const latest = useRef<HTMLLIElement>(null)
  useTitle('Pídeselo a Vita')
  useEffect(() => { chatStore.getState().enter(actor.id) }, [actor.id])
  // La respuesta se lee desde el principio: nadie debe confirmar algo que no ve. Si no cabe junto a lo de escribir, el foco va a ella.
  useEffect(() => {
    const turn = latest.current
    if (!turn || !form.current) return
    turn.scrollIntoView({ block: 'start' })
    const inset = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingBottom)
    if (isHiddenBelow(form.current.getBoundingClientRect().bottom, window.innerHeight, inset)) turn.focus({ preventScroll: true })
  }, [turns.length])

  const say = (message: string) => {
    if (!message.trim()) { input.current?.focus(); return }
    chatStore.getState().enter(actor.id)
    chatStore.getState().add(message.trim(), answer(message, { actor, members, records, enabled: family.enabledModules, today, emergencyNumber, canReadPhotos: photoReading && SERVER_HOUSEHOLD !== null }))
    setText('')
    input.current?.focus({ preventScroll: true })
  }
  return (
    <div className="mx-auto grid w-full max-w-3xl grid-cols-1 gap-5">
      <PageHeader title="Pídeselo a Vita" description="Entiende frases sencillas, sin inteligencia artificial, y nada sale de este dispositivo. Nada se guarda hasta que tú lo confirmas." />
      <div role="log" aria-label="Conversación" className={turns.length === 0 ? 'sr-only' : undefined}>
        <ol className="grid grid-cols-1 gap-5">
        {turns.map((turn, i) => (
          <li key={turn.id} ref={i === turns.length - 1 ? latest : undefined} tabIndex={-1} className="grid grid-cols-1 gap-3 outline-none">
            <p className="ml-auto max-w-[85%] bg-marino px-4 py-2 break-words text-crema"><span className="sr-only">Tú: </span>{turn.message}</p>
            <div className="bg-crema p-4 shadow-panel"><span className="sr-only">Vita: </span><ReplyView turn={turn} /></div>
          </li>
        ))}
        </ol>
      </div>
      <form ref={form} onSubmit={(e: FormEvent) => { e.preventDefault(); say(text) }} className="grid grid-cols-1 gap-3 bg-crema p-4 shadow-panel">
        <TextInput ref={input} label="Escribe a Vita" required autoComplete="off" maxLength={MAX_MESSAGE} value={text} onChange={(e) => setText(e.target.value)} />
        <div className="flex flex-wrap justify-between gap-3">
          <Button type="submit" variant="primary" icon={Send}>Enviar</Button>
          {turns.length > 0 && <Button icon={Trash2} onClick={() => { chatStore.getState().clear(); input.current?.focus() }}>Borrar conversación</Button>}
        </div>
      </form>
      <section aria-labelledby="chat-ideas">
        <h2 id="chat-ideas" className="mb-2 text-lg font-bold">Prueba con</h2>
        <ul className="flex flex-wrap gap-2">{SUGGESTIONS.map((s) => <li key={s}><Button size="sm" onClick={() => say(s)}>{s}</Button></li>)}</ul>
      </section>
    </div>
  )
}

const NONE: never[] = []
