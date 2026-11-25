import { useEffect, useRef, useState } from 'react'
import { dictationProblem } from '@/services/dictation'

/** Lo mínimo que se usa: TypeScript aún no trae estos tipos. */
interface Recognition extends EventTarget {
  lang: string
  interimResults: boolean
  processLocally?: boolean
  start: () => void
  stop: () => void
  abort: () => void
}
interface RecognitionClass {
  new (): Recognition
  available?: (options: { langs: string[]; processLocally: boolean }) => Promise<string>
}
interface ResultEvent extends Event { readonly results: ArrayLike<ArrayLike<{ readonly transcript: string }>> }

const LANG = 'es-ES'

function recognitionClass(): RecognitionClass | undefined {
  const scope = globalThis as { SpeechRecognition?: RecognitionClass; webkitSpeechRecognition?: RecognitionClass }
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition
}

export const canDictate = () => recognitionClass() !== undefined

/** Si el navegador puede reconocer la voz en el propio dispositivo, nada sale de él. Solo se pregunta cuando la persona va a hablar. */
async function dictatesLocally(): Promise<boolean> {
  try { return (await recognitionClass()?.available?.({ langs: [LANG], processLocally: true })) === 'available' } catch { return false }
}

export function useDictation(onText: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const [problem, setProblem] = useState<string>()
  const started = useRef(false)
  const current = useRef<Recognition | null>(null)
  useEffect(() => () => {
    current.current?.abort()
    current.current = null
  }, [])

  /** `remote`: se ha aceptado que la voz pueda salir del dispositivo. */
  const start = async (remote: boolean) => {
    const Recognizer = recognitionClass()
    if (!Recognizer || current.current) return
    const recognition = new Recognizer()
    current.current = recognition
    setProblem(undefined)
    setListening(true)
    recognition.lang = LANG
    recognition.interimResults = false
    if (!remote) {
      const local = await dictatesLocally()
      // Pudo cerrarse la pantalla, o pararse, mientras se preguntaba.
      if (current.current !== recognition) return
      recognition.processLocally = local
    }
    if (!remote && !recognition.processLocally) {
      current.current = null
      setListening(false)
      setProblem('Este navegador necesita enviar la voz fuera del dispositivo para reconocerla. Si te parece bien, permítelo en Ajustes.')
      return
    }
    started.current = true
    recognition.addEventListener('result', (e) => onText(Array.from((e as ResultEvent).results, (r) => r[0]?.transcript ?? '').join(' ')))
    recognition.addEventListener('error', (e) => setProblem(dictationProblem((e as Event & { error: string }).error)))
    recognition.addEventListener('end', () => { started.current = false; current.current = null; setListening(false) })
    try {
      recognition.start()
    } catch {
      started.current = false
      current.current = null
      setListening(false)
      setProblem(dictationProblem(''))
    }
  }
  const stop = () => {
    if (started.current) { current.current?.stop(); return }
    current.current = null
    setListening(false)
  }
  return { listening, problem, start, stop }
}
