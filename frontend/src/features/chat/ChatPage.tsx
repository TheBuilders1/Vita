import { Mic, Paperclip, Send, Square, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useStore } from 'zustand'
import { useHome, type Home } from '@/app/providers/home'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { FieldError, TextInput } from '@/components/ui/Field'
import { canDictate, useDictation } from '@/hooks/useDictation'
import { useTitle } from '@/hooks/useTitle'
import { useToday } from '@/hooks/useToday'
import { answer, askOrchestrator, assistantContext, CHAT_ATTACHMENT_ACCEPT, MAX_MESSAGE, shouldUseAssistant, validateChatAttachments } from '@/services/chat'
import { joinDictation } from '@/services/dictation'
import { describeError } from '@/services/errors'
import { SERVER_HOUSEHOLD } from '@/services/homeServer'
import { chatStore, settingsStore } from '@/store'
import { formatBytes } from '@/utils/format'
import { newId } from '@/utils/ids'
import { isHiddenBelow } from '@/utils/reveal'
import { ReplyView } from './ReplyView'

const SUGGESTIONS = ['¿Qué tengo esta semana?', 'Busca el DNI', '¿Cuánto llevamos en comida?', 'Recuérdame regar las plantas cada lunes a las 9']
const FORM_BUTTON = 'max-w-full [overflow-wrap:anywhere] max-[24rem]:px-3'
type ChatAttachment = { readonly id: string; readonly file: File }

/** Los encargos y consultas del hogar se resuelven localmente; solo el chat abierto usa el orquestador. */
export function ChatPage() {
  const home = useHome()
  return <ProfileChat key={home.actor.id} home={home} />
}

function ProfileChat({ home: { actor, members, records, family } }: { home: Home }) {
  const today = useToday()
  const { emergencyNumber, photoReading, dictation } = useStore(settingsStore, (s) => s.settings)
  const turns = useStore(chatStore, (s) => (s.actorId === actor.id ? s.turns : NONE))
  const [text, setText] = useState('')
  const [thinking, setThinking] = useState(false)
  const [attachments, setAttachments] = useState<ChatAttachment[]>([])
  const [attachmentError, setAttachmentError] = useState<string>()
  const thinkingRef = useRef(false)
  // Se añade a lo escrito y espera: se puede corregir antes de enviar.
  const voice = useDictation((spoken) => { setText((written) => joinDictation(written, spoken, MAX_MESSAGE)); input.current?.focus({ preventScroll: true }) })
  const form = useRef<HTMLFormElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
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

  const addAttachments = (incoming: readonly File[]) => {
    if (SERVER_HOUSEHOLD === null) {
      setAttachmentError('Los adjuntos requieren el servidor local de Vita.')
      return
    }
    const files = [...attachments.map(({ file }) => file), ...incoming]
    const error = validateChatAttachments(files)
    if (error) { setAttachmentError(error); return }
    setAttachments((current) => [...current, ...incoming.map((file) => ({ id: newId(), file }))])
    setAttachmentError(undefined)
  }

  const say = async (message: string) => {
    const clean = message.trim() || (attachments.length > 0 ? 'Ayúdame a entender el contenido adjunto.' : '')
    if (!clean) { input.current?.focus(); return }
    if (thinkingRef.current) return
    chatStore.getState().enter(actor.id)
    const store = chatStore.getState()
    const reply = answer(clean, { actor, members, records, enabled: family.enabledModules, today, emergencyNumber, canReadPhotos: photoReading && SERVER_HOUSEHOLD !== null })
    const details = reply.kind === 'facts' || reply.kind === 'agenda' ? reply : undefined
    const hasAttachments = attachments.length > 0
    const useAssistant = shouldUseAssistant(reply, hasAttachments)
    const userMessage = hasAttachments
      ? `${clean}\n\nAdjuntos: ${attachments.map(({ file }) => file.name || 'archivo').join(', ')}`
      : clean
    setText('')
    setAttachmentError(undefined)
    input.current?.focus({ preventScroll: true })
    if (!useAssistant) {
      store.add(clean, reply, details)
      if (hasAttachments) setAttachmentError('No he procesado los adjuntos porque esta petición requiere una acción o respuesta local. Pregunta por el archivo en otro mensaje.')
      return
    }
    if (SERVER_HOUSEHOLD === null) {
      store.add(userMessage, { kind: 'text', text: 'La conversación y la lectura de adjuntos necesitan el servidor local de Vita. Tus archivos siguen en este equipo.' }, details)
      return
    }

    thinkingRef.current = true
    setThinking(true)
    const conversationId = store.conversationId
    const turnId = store.add(userMessage, { kind: 'text', text: 'Estoy pensando…' }, details)
    try {
      const response = await askOrchestrator({ message: clean, conversationId, context: assistantContext(reply), attachments: attachments.map(({ file }) => file) })
      const current = chatStore.getState()
      if (current.actorId === actor.id && current.conversationId === conversationId) current.updateReply(turnId, { kind: 'assistant', text: response })
      setAttachments([])
      setAttachmentError(undefined)
    } catch (error) {
      const current = chatStore.getState()
      if (current.actorId === actor.id && current.conversationId === conversationId) current.updateReply(turnId, { kind: 'text', text: describeError(error) })
    } finally {
      thinkingRef.current = false
      setThinking(false)
    }
  }
  const description = SERVER_HOUSEHOLD === null
    ? 'El chat con IA y los adjuntos requieren el servidor local. En esta versión, las consultas del hogar se resuelven en este navegador.'
    : 'Pega imágenes o adjunta JPG/PNG/WebP, PDF, TXT o DOCX. El archivo se lee localmente; tu pregunta, el texto extraído y los datos visibles necesarios se envían a Ollama Cloud. OpenClaw conserva el contexto del chat.'
  return (
    <div className="mx-auto grid w-full max-w-3xl grid-cols-1 gap-5">
      <PageHeader title="Pídeselo a Vita" description={description} />
      <div role="log" aria-label="Conversación" className={turns.length === 0 ? 'sr-only' : undefined}>
        <ol className="grid grid-cols-1 gap-5">
        {turns.map((turn, i) => (
          <li key={turn.id} ref={i === turns.length - 1 ? latest : undefined} tabIndex={-1} className="grid min-w-0 grid-cols-1 gap-3 focus-visible:outline">
            <p className="ml-auto max-w-[85%] bg-marino px-4 py-2 break-words text-crema"><span className="sr-only">Tú: </span>{turn.message}</p>
            <div className="min-w-0 bg-crema p-4 shadow-panel max-[24rem]:p-2"><span className="sr-only">Vita: </span><ReplyView turn={turn} /></div>
          </li>
        ))}
        </ol>
      </div>
      <form
        ref={form}
        onSubmit={(e: FormEvent) => { e.preventDefault(); void say(text) }}
        onPaste={(e) => {
          const pasted = [...e.clipboardData.files]
          if (pasted.length === 0) {
            pasted.push(...[...e.clipboardData.items]
              .filter((item) => item.kind === 'file')
              .flatMap((item) => {
                const file = item.getAsFile()
                return file ? [file] : []
              }))
          }
          if (pasted.length > 0) {
            e.preventDefault()
            addAttachments(pasted)
          }
        }}
        className="grid grid-cols-1 gap-3 bg-crema p-4 shadow-panel max-[24rem]:p-2"
      >
        <TextInput ref={input} label="Escribe a Vita" required={attachments.length === 0} autoComplete="off" maxLength={MAX_MESSAGE} value={text} disabled={thinking} onChange={(e) => setText(e.target.value)} />
        {attachments.length > 0 && (
          <ul aria-label="Adjuntos" className="grid grid-cols-1 gap-2">
            {attachments.map(({ id, file }) => (
              <li key={id} className="flex min-h-11 items-center gap-2 bg-yeso p-2">
                <Paperclip aria-hidden="true" className="size-5 shrink-0" />
                <span className="min-w-0 flex-1 break-words">{file.name || 'Imagen pegada'} <span className="text-apagado">({formatBytes(file.size)})</span></span>
                <Button type="button" size="sm" icon={X} disabled={thinking} onClick={() => setAttachments((current) => current.filter((item) => item.id !== id))}>
                  <span className="sr-only">Quitar {file.name || 'adjunto'}</span>
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div role="alert">{attachmentError && <FieldError id={undefined} message={attachmentError} />}</div>
        <input
          ref={fileInput}
          type="file"
          accept={CHAT_ATTACHMENT_ACCEPT}
          multiple
          disabled={thinking || SERVER_HOUSEHOLD === null}
          className="sr-only"
          aria-label="Adjuntar imágenes o documentos"
          onChange={(e) => { addAttachments(Array.from(e.currentTarget.files ?? [])); e.currentTarget.value = '' }}
        />
        <div className="flex flex-wrap justify-between gap-3">
          <div className="flex min-w-0 max-w-full flex-wrap gap-3">
            <Button className={FORM_BUTTON} type="submit" variant="primary" icon={Send} disabled={thinking}>Enviar</Button>
            <Button className={FORM_BUTTON} type="button" icon={Paperclip} disabled={thinking || SERVER_HOUSEHOLD === null} onClick={() => fileInput.current?.click()}>
              Adjuntar
            </Button>
            {dictation !== 'off' && canDictate() && <Button className={FORM_BUTTON} icon={voice.listening ? Square : Mic} disabled={thinking} onClick={() => { if (voice.listening) voice.stop(); else void voice.start(dictation === 'any') }}>{voice.listening ? 'Dejar de dictar' : 'Dictar'}</Button>}
          </div>
          {turns.length > 0 && <Button className={FORM_BUTTON} icon={Trash2} disabled={thinking} onClick={() => { chatStore.getState().clear(); input.current?.focus() }}>Borrar conversación</Button>}
        </div>
        <output className="font-bold empty:hidden">{thinking ? 'Vita está pensando…' : voice.listening && 'Te escucho. Habla con calma.'}</output>
        <div role="alert"><FieldError id={undefined} message={voice.problem} /></div>
      </form>
      <section aria-labelledby="chat-ideas">
        <h2 id="chat-ideas" className="mb-2 text-lg font-bold">Prueba con</h2>
        <ul className="flex flex-wrap gap-2">{SUGGESTIONS.map((s) => <li key={s} className="min-w-0 max-w-full"><Button size="sm" className="max-w-full [overflow-wrap:anywhere]" disabled={thinking} onClick={() => { void say(s) }}>{s}</Button></li>)}</ul>
      </section>
    </div>
  )
}

const NONE: never[] = []
