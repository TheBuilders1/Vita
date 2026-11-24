import type { AgendaItem } from './agenda'

type Voice = Pick<SpeechSynthesisVoice, 'lang' | 'localService' | 'name'>

const MAX = 220

/** Las voces que no son del dispositivo envían el texto a un servidor: no se usan nunca. */
export function pickVoice<V extends Voice>(voices: readonly V[]): V | undefined {
  const spanish = voices.filter((v) => v.localService && /^es([-_]|$)/i.test(v.lang))
  return spanish.find((v) => /^es[-_]ES/i.test(v.lang)) ?? spanish[0]
}

/** En trozos cortos: algunos navegadores se paran a mitad de un texto largo. */
export function spokenParts(text: string): string[] {
  const sentences = text.replace(/\bhttps?:\/\/\S+|\bwww\.\S+/gi, 'un enlace').split(/\n+|(?<=[.!?…])\s+/).map((s) => s.trim()).filter(Boolean)
  return sentences.flatMap((s) => s.match(new RegExp(`.{1,${MAX}}(?:\\s+|$)|.{1,${MAX}}`, 'gsu')) ?? []).map((s) => s.trim())
}

export function spokenAgenda(heading: string, items: readonly AgendaItem[]): string {
  const pending = items.filter((i) => !i.done)
  if (pending.length === 0) return `${heading} no hay nada pendiente.`
  const lines = pending.map((i) => {
    const what = [i.time && `A las ${i.time}`, i.title].filter(Boolean).join(', ')
    return [what, i.label, i.detail].filter(Boolean).map((t) => String(t).replace(/\.$/, '')).join('. ')
  })
  return `${heading}.\n${lines.map((l) => `${l}.`).join('\n')}`
}
