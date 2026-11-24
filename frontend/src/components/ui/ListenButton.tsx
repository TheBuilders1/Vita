import { Square, Volume2 } from 'lucide-react'
import { useSpeech } from '@/hooks/useSpeech'
import { Button } from './Button'

/** Si el dispositivo no tiene voz en español, no aparece. `text` se calcula al pulsar. */
export function ListenButton({ text, label = 'Escuchar', size = 'sm' }: { text: () => string; label?: string; size?: 'sm' | 'lg' }) {
  const { available, speaking, speak, stop } = useSpeech()
  if (!available) return null
  return <Button size={size} icon={speaking ? Square : Volume2} onClick={() => { if (speaking) stop(); else speak(text()) }}>{speaking ? 'Parar' : label}</Button>
}
