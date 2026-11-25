import { CalendarDays, Check, Mic, Paperclip, NotebookPen, Phone, RotateCcw, Search, Send, Square } from 'lucide-react'
import { useEffect, useEffectEvent, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { useStore } from 'zustand'
import { useHome, type Home } from '@/app/providers/home'
import { Button } from '@/components/ui/Button'
import { LogoMark } from '@/components/layout/Logo'
import { canDictate, useDictation } from '@/hooks/useDictation'
import { useTitle } from '@/hooks/useTitle'
import { useToday } from '@/hooks/useToday'
import { MODULES } from '@/modules/registry'
import type { ModuleId } from '@/modules/types'
import { accessTo } from '@/services/permissions'
import { respond, followUps } from '@/services/chat/connected'
import { MAX_MESSAGE, todaySummary, type Reply } from '@/services/chat'
import { ListenButton } from '@/components/ui/ListenButton'
import { joinDictation } from '@/services/dictation'
import { describeError } from '@/services/errors'
import { useSpeech } from '@/hooks/useSpeech'
import type { Settings } from '@/database/repositories/settings'
import { SERVER_HOUSEHOLD } from '@/services/homeServer'
import { chatStore, settingsStore, toastStore } from '@/store'
import { greeting, restartConversation, scrollDistance } from './conversation'
import { UploadDialog } from '@/features/dashboard/UploadDialog'
import { ReplyView } from './ReplyView'

const SUGGESTIONS = ['¿Qué tengo esta semana?', 'Busca el DNI', '¿Cuánto llevamos en comida?', 'Recuérdame regar las plantas cada lunes a las 9']
const ROOM_IDEAS: Partial<Record<ModuleId, string>> = {
  dental: 'Anótame dentista el martes a las 10', healthRecord: 'Mis citas de esta semana',
  diet: '¿Qué alergias tengo?', medication: 'Mi medicación', documents: '¿Cuándo caduca mi DNI?',
  shopping: '¿Qué falta en la compra?', finances: '¿Cuánto llevamos en comida?',
  emergency: 'Teléfonos de emergencia', planner: 'Recuérdame regar las plantas mañana',
}
const STARTERS = [
  { label: 'Apuntar algo', icon: NotebookPen, example: 'Apunta dentista el martes a las 10', editable: true },
  { label: '¿Qué tengo hoy?', icon: CalendarDays, example: '¿Qué tengo hoy?' },
  { label: 'Buscar un dato', icon: Search, example: 'Busca el DNI', editable: true },
  { label: 'Teléfonos de emergencia', icon: Phone, example: 'Teléfonos de emergencia' },
]
const RESTARTED = 'Has empezado una conversación nueva.'

export function ChatPage() {
  useTitle('Pídeselo a Vita')
  const home = useHome()
  return <ProfileChat key={home.actor.id} home={home} />
}

export function ProfileChat({ home: { actor, members, records, family }, panel = false, fromRoom }: { home: Home; panel?: boolean; fromRoom?: string }) {
  const today = useToday()
  const [params, setParams] = useSearchParams()
  const from = panel ? fromRoom : params.get('desde')
  const room = MODULES.find((m) => m.id === from && family.enabledModules.includes(m.id) && accessTo(actor, m.id) !== 'none')
  const origin = from === 'calendar' ? from : room?.id
  const place = room?.name ?? (origin === 'calendar' ? 'Calendario' : '')
  const suggestions = room ? [ROOM_IDEAS[room.id] ?? `Busca ${room.name}`, '¿Qué tengo esta semana?']
    : origin === 'calendar' ? ['¿Qué tengo hoy?', '¿Qué tengo mañana?', 'Anótame dentista el martes a las 10'] : SUGGESTIONS
  const requestedVoice = !panel && params.get('hablar') === '1'
  const [showExample, setShowExample] = useState(requestedVoice)
  const { emergencyNumber, photoReading, dictation, connectedChat } = useStore(settingsStore, (s) => s.settings)
  const turns = useStore(chatStore, (s) => (s.actorId === actor.id ? s.turns : NONE))
  const [text, setText] = useState('')
  const [hour] = useState(() => new Date().getHours())
  // Se añade a lo escrito y espera: se puede corregir antes de enviar.
  // Si se le ha hablado, Vita contesta también en voz alta. Si se escribe, calla.
  const spokenTurn = useRef(false)
  const voice = useDictation((spoken) => { spokenTurn.current = true; setText((written) => joinDictation(written, spoken, MAX_MESSAGE)); input.current?.focus({ preventScroll: true }) })
  const speech = useSpeech()
  const [askVoice, setAskVoice] = useState(false)
  const listen = (mode: Settings['dictation']) => {
    setAskVoice(false)
    if (mode === 'off') return
    void voice.start(mode === 'any')
  }
  const [noVoice, setNoVoice] = useState(false)
  const [uploading, setUploading] = useState(false)
  const talk = () => {
    if (!canDictate()) { setNoVoice(true); return }
    if (voice.listening) voice.stop()
    else if (dictation === 'off') setAskVoice(!askVoice)
    else listen(dictation)
  }
  const chooseVoice = (mode: 'device' | 'any') => {
    settingsStore.getState().update({ dictation: mode })
      .then(() => { toastStore.getState().show(mode === 'device' ? 'Voz activada en este dispositivo' : 'Voz activada'); listen(mode) })
      .catch((cause: unknown) => toastStore.getState().show(describeError(cause), 'error'))
  }
  const [pending, setPending] = useState('')
  const request = useRef<AbortController>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  const latest = useRef<HTMLDivElement>(null)
  const history = useRef<HTMLDivElement>(null)
  const composer = useRef<HTMLFormElement>(null)
  const requestedScroll = useRef(false)
  const resetToast = useStore(toastStore, state => panel ? state.toasts.find(t => t.message === RESTARTED) : undefined)
  useEffect(() => () => request.current?.abort(), [])
  const openMicrophone = useEffectEvent(() => {
    setShowExample(true)
    setParams((current) => { current.delete('hablar'); return current }, { replace: true, preventScrollReset: true })
    input.current?.focus()
    if (dictation !== 'off' && canDictate()) void voice.start(dictation === 'any')
  })
  useEffect(() => {
    if (!requestedVoice) return
    const frame = requestAnimationFrame(() => openMicrophone())
    return () => cancelAnimationFrame(frame)
  }, [requestedVoice])
  useEffect(() => {
    if (showExample && voice.problem) input.current?.focus()
  }, [showExample, voice.problem])
  const latestId = turns.at(-1)?.id
  useEffect(() => {
    if (!latest.current || !history.current || !composer.current || (!panel && !requestedScroll.current)) return
    // En el panel se desplaza el cuerpo del diálogo, no la página.
    const scroller = panel ? history.current.parentElement?.closest<HTMLElement>('.overflow-y-auto') : undefined
    const bounds = (scroller ?? history.current).getBoundingClientRect()
    const { top, bottom } = latest.current.getBoundingClientRect()
    const distance = scrollDistance(top, bottom, panel ? bounds.top : 8, composer.current.getBoundingClientRect().top - 8)
    if (distance) {
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduced'
      const target = scroller ?? window
      target.scrollBy({ top: distance, behavior: reduced || !requestedScroll.current ? 'instant' : 'smooth' })
    }
  }, [latestId, pending, panel])
  // Al abrir el panel se ve lo último de la conversación, junto a donde se escribe.
  useEffect(() => { if (panel) composer.current?.scrollIntoView({ block: 'end' }) }, [panel])

  const say = async (message: string, previous?: Reply) => {
    const written = message.trim()
    if (!written || request.current) { input.current?.focus(); return }
    chatStore.getState().enter(actor.id)
    const controller = new AbortController()
    const result = respond(written, {
      actor, members, records, origin, today, emergencyNumber, enabled: family.enabledModules,
      previous: previous ?? turns.at(-1)?.reply, canReadPhotos: photoReading && SERVER_HOUSEHOLD !== null,
    }, turns, connectedChat, SERVER_HOUSEHOLD, controller.signal)
    requestedScroll.current = true
    setText('')
    input.current?.focus({ preventScroll: true })
    if (result instanceof Promise) {
      request.current = controller
      setPending(written)
    }
    const { reply, remote } = await result
    if (controller.signal.aborted || chatStore.getState().actorId !== actor.id) return
    chatStore.getState().add(written, reply, remote)
    if (spokenTurn.current && speech.available) speech.speak(reply.text)
    spokenTurn.current = false
    request.current = null
    setPending('')
  }
  const clear = () => {
    const undo = restartConversation(chatStore)
    toastStore.getState().show(RESTARTED, 'success', { label: 'Deshacer', run: undo })
    input.current?.focus({ preventScroll: true })
  }
  const last = turns.at(-1)
  const dayText = todaySummary({ actor, members, records, enabled: family.enabledModules, today, emergencyNumber, canReadPhotos: false })
  // En la portada ya están los botones de inicio: las sugerencias solo si se viene de una habitación.
  const chips = last ? followUps(last.reply) : origin ? suggestions.slice(0, 3) : []
  const empty = !last && !pending
  const Heading = panel ? 'h3' : 'h1'
  return (
    <div className={`chat-shell ${panel ? 'chat-panel' : 'chat-page'}`}>
      <div ref={history} className="chat-history">
        <header className="chat-header">
          <LogoMark className="chat-face" />
          <div className="min-w-0">
            <Heading className="text-3xl font-bold">{empty ? `${greeting(hour)}, ${actor.name}` : 'Tu conversación con Vita'}</Heading>
            {empty && <p>{dayText}</p>}
            {empty && <div className="mt-2"><ListenButton text={() => dayText} /></div>}
            {empty && <p className="mt-2 text-apagado">Puedo ayudarte a apuntar una cita, consultar tu agenda o encontrar un dato de tu hogar.</p>}
            {place && <p className="text-apagado">Hablas con Vita desde {place}.</p>}
          </div>
        </header>
        {connectedChat && SERVER_HOUSEHOLD && <p className="chat-connection">Vita conectada está activa. Si necesito ayuda, consultaré tu mensaje con el servidor del hogar. Evita incluir datos privados.</p>}
        {empty && <button type="button" className="chat-talk pixel-edge" onClick={talk}><Mic aria-hidden="true" />{voice.listening ? 'Te escucho…' : 'Pulsa y habla'}<span>o escribe abajo, como prefieras</span></button>}
        {empty && <div className="chat-starters">{STARTERS.map(({ label, icon: Icon, example, editable }) => (
          <button type="button" key={label} className="chat-starter pixel-edge" onClick={() => {
            if (editable) { setText(example); input.current?.focus() }
            else void say(example)
          }}><Icon aria-hidden="true" />{label}</button>
        ))}</div>}
        <div role="log" aria-label="Conversación">
          <ol className="chat-turns">
            {turns.map((turn, i) => (
              <li key={turn.id} className="chat-turn">
                <p className="chat-person"><span className="sr-only">Tú: </span>{turn.message}</p>
                <div ref={i === turns.length - 1 && !pending ? latest : undefined} className="chat-reply">
                  <LogoMark className="chat-avatar" /><span className="sr-only">Vita: </span><ReplyView turn={turn} />
                </div>
              </li>
            ))}
            {pending && <li className="chat-turn"><p className="chat-person"><span className="sr-only">Tú: </span>{pending}</p></li>}
          </ol>
        </div>
        <div ref={pending ? latest : undefined} role="status" aria-live="polite" className="chat-wait">{pending && 'Un momento, lo estoy mirando'}</div>
        {last && <Button size="sm" icon={RotateCcw} disabled={!!pending} onClick={clear}>Empezar de nuevo</Button>}
      </div>
      <form ref={composer} onSubmit={(e: FormEvent) => { e.preventDefault(); void say(text) }} className={`chat-composer ${empty ? '' : 'chat-composer-sticky'}`}>
        {resetToast?.action && <div role="status" className="chat-reset">{RESTARTED} <button type="button" onClick={() => { resetToast.action?.run(); toastStore.getState().dismiss(resetToast.id) }}>Deshacer</button></div>}
        {chips.length > 0 && <div className="chat-chips" role="group" aria-label="Sugerencias">{chips.map(label => (
          <button type="button" key={label} disabled={!!pending} onClick={() => void say(label, last?.reply)}>{label}</button>
        ))}</div>}
        <label className="sr-only" htmlFor="chat-message">Escribe a Vita</label>
        <div className="chat-entry">
          <textarea id="chat-message" ref={input} required rows={1} maxLength={MAX_MESSAGE} value={text} onChange={e => setText(e.target.value)}
            placeholder="Por ejemplo, compra leche y pan" onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void say(text) }
            }} />
          <button type="button" className={`chat-mic ${voice.listening ? 'chat-mic-on' : ''}`} aria-pressed={voice.listening} aria-expanded={dictation === 'off' && canDictate() ? askVoice : undefined} onClick={talk}>
            {voice.listening ? <Square aria-hidden="true" /> : <Mic aria-hidden="true" />}<span className="sr-only">{voice.listening ? 'Dejar de hablar' : 'Hablar'}</span>
          </button>
          <Button className="chat-send" disabled={!!pending || !text.trim()} type="submit" variant="primary" icon={Send}><span className="max-[30rem]:sr-only">Enviar</span></Button>
        </div>
        {showExample && !voice.listening && <p>Escribe, por ejemplo: dentista el martes a las 10</p>}
        <div className="chat-controls">
          <p><Check aria-hidden="true" />Nada se guarda sin que lo confirmes</p>
          <button type="button" className="chat-attach" onClick={() => setUploading(true)}><Paperclip aria-hidden="true" />Subir documento</button>
          {speech.speaking && <Button size="sm" icon={Square} onClick={speech.stop}>Callar a Vita</Button>}
        </div>
        {askVoice && (
          <div className="chat-voice-ask">
            <p>Para hablar con Vita hace falta el micrófono. Solo escucha mientras el botón está pulsado y nada se guarda sin que lo confirmes. ¿Cómo prefieres?</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="primary" onClick={() => chooseVoice('device')}>Solo en este dispositivo</Button>
              <Button size="sm" onClick={() => chooseVoice('any')}>Con el servicio del navegador</Button>
              <Button size="sm" onClick={() => setAskVoice(false)}>Ahora no</Button>
            </div>
            <p className="text-apagado">Con el servicio del navegador, tu voz puede enviarse a la empresa que lo hace (por ejemplo, Google o Apple). Puedes cambiarlo en Ajustes.</p>
          </div>
        )}
        {noVoice && <p role="status">Este navegador no puede escuchar. Prueba con Chrome, Edge o Safari, o escríbelo: Vita lo entiende igual.</p>}
        <UploadDialog open={uploading} onClose={() => setUploading(false)} />
        <output className="empty:hidden">{voice.listening && 'Te escucho. Habla con calma.'}</output>
        <p role="status" className="empty:hidden">{voice.problem}</p>
      </form>
    </div>
  )
}

const NONE: never[] = []
