import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { pickVoice, spokenParts } from '@/services/speech'

const synth = () => (typeof speechSynthesis === 'undefined' ? undefined : speechSynthesis)

/** Las voces llegan tarde: el navegador avisa cuando las tiene. */
function subscribe(notify: () => void) {
  const engine = synth()
  engine?.addEventListener('voiceschanged', notify)
  return () => engine?.removeEventListener('voiceschanged', notify)
}
const currentVoice = () => pickVoice(synth()?.getVoices() ?? [])
const voiceId = () => currentVoice()?.voiceURI

/** De quién es lo que suena: el motor es uno solo para toda la página. */
let speaker: symbol | null = null

/** Lee en voz alta con una voz en español del propio dispositivo. Sin ninguna, `available` es falso. */
export function useSpeech() {
  const available = useSyncExternalStore(subscribe, voiceId) !== undefined
  const [speaking, setSpeaking] = useState(false)
  // Solo se calla lo propio: al cerrar una ficha no debe cortarse lo que lee otra.
  const turn = useRef<symbol | null>(null)
  const stop = () => {
    if (turn.current && turn.current === speaker) { speaker = null; synth()?.cancel() }
    turn.current = null
    setSpeaking(false)
  }
  useEffect(() => stop, [])

  const speak = (text: string) => {
    const engine = synth()
    const voice = currentVoice()
    const parts = spokenParts(text)
    if (!engine || !voice || parts.length === 0) return
    const own = Symbol('turn')
    turn.current = own
    speaker = own
    engine.cancel()
    setSpeaking(true)
    // Lo cancelado avisa con retraso: no debe apagar lo que ha empezado después.
    const finish = () => { if (turn.current === own) { turn.current = null; setSpeaking(false) } }
    parts.forEach((part, i) => {
      const utterance = Object.assign(new SpeechSynthesisUtterance(part), { voice, lang: voice.lang, rate: 0.95 })
      if (i === parts.length - 1) utterance.addEventListener('end', finish)
      utterance.addEventListener('error', finish)
      engine.speak(utterance)
    })
  }
  return { available, speaking, speak, stop }
}
