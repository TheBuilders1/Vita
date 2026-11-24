import { moduleLink } from '@/utils/links'
import { ages, agenda, allergies, expiry, medication, phones, shoppingPending } from './consult'
import { propose } from './propose'
import type { ChatContext, Reply } from './types'
import { cut, phrase } from './when'

export type { ChatContext, ChatLink, Fact, Proposal, Reply } from './types'

/** Lo más largo que se lee: de sobra para una frase. */
export const MAX_MESSAGE = 500

const POLITE = /^[\s¿¡]*(?:(?:oye|hola|por favor|vita)[,\s]+)*/
const URGENT = /\b(emergencias?|ambulancia|112|no respira|infarto|ictus|se (?:ahoga|esta ahogando|ha desmayado)|inconsciente|socorro|auxilio|ayuda urgente|se desangra)\b/
const SELF_HARM = /\b(suicid\w*|(?:me )?quiero morir(?:me)?|quitarme la vida|matarme|no quiero vivir)\b/
const CARD = /\b(telefonos?|contactos?|ficha|numero) (?:de |para )?emergencias?\b/
const REFUSED_ADD = /^no (?:me )?(?:apuntes|anotes|añadas|guardes|pongas|crees|compres)\b/
const CHANGE = /^(?:borra|elimina|quita|cancela|cambia|mueve|modifica|pospon|retrasa|adelanta|edita)\w*\b/
const ADD = /^(?:apunta(?:r|me|lo|melo)?|anota(?:r|me|lo)?|añad(?:e|ir|eme)|pon(?:me|er)?|agenda(?:me|r)?|programa(?:me|r)?|crea(?:r|me)?|recuerda(?:me)?|recordar(?:me)?|hay que|tengo que|tenemos que|quiero apuntar|nuev[oa])\b(?: que)?\s*:?\s*/
const NEED_BUY = /^necesito (?=comprar)/
const STATED = /^tengo (?:una? )?(?=cita|dentista|medic[oa]|pediatra|reunion)/
const BUY = /^compra(?:r)?\b/
const ADVICE = /\b(?:que|cual)\b.{0,12}\btom[oa]r? para\b|\bpuedo (?:tomar|dar|darle)\b|\b(?:que|cuanta) dosis\b|\b(?:me|le) duele\b|\btengo fiebre\b|\btiene fiebre\b|\bes normal que\b/
const PHOTO = /\b(escane\w*|lee(?:r|me)? (?:la |una |esta )?(?:foto|caducidad|documento)|foto (?:del|de un|de mi) (?:documento|dni))/
const AGENDA = /^(?:que|cuales)\b.*\b(?:tengo|tenemos|tienes?|hay|toca|pendientes?|planes|eventos|citas)\b|^(?:mi )?(?:agenda|calendario)\b|^planes\b|^(?:tengo|tenemos|hay) (?:algo|planes|citas?)\b/
const HELP = /^(?:hola|buen[oa]s\b|ayuda|que (?:puedes|sabes) hacer|quien eres|como funciona)/

const HELP_TEXT = 'Entiendo frases sencillas: no soy inteligencia artificial y nada de lo que escribes sale de aquí. Puedo apuntar citas, tareas y compra, decirte qué hay en la agenda y buscar caducidades, edades, alergias o teléfonos. Nada se guarda hasta que tú lo confirmas.'
const UNKNOWN = 'No te he entendido. Prueba con «apunta dentista para el martes a las 10», «compra leche y pan» o «qué tengo esta semana».'

function emergency({ records, emergencyNumber }: ChatContext, selfHarm: boolean): Reply {
  const contacts = records.filter((r) => r.typeId === 'emergencyContact')
    .toSorted((a, b) => Number(a.data.priority ?? 99) - Number(b.data.priority ?? 99))
    .map((r) => ({ name: String(r.data.name), phone: String(r.data.phone) }))
  return selfHarm
    ? { kind: 'emergency', text: 'Siento que estés pasando por esto. No estás a solas: en España el 024 atiende gratis, a cualquier hora y de forma confidencial. Si hay peligro ahora, llama a emergencias.', number: emergencyNumber, helpline: '024', contacts }
    : { kind: 'emergency', text: 'Si es una emergencia, llama ahora. Vita no puede llamar por ti.', number: emergencyNumber, contacts }
}

/** Contesta con reglas, en este dispositivo. Nunca guarda, cambia ni borra nada por su cuenta. */
export function answer(message: string, context: ChatContext): Reply {
  const full = phrase(message.slice(0, MAX_MESSAGE))
  const text = cut(full, 0, POLITE.exec(full.plain)?.[0].length ?? 0)
  const said = text.plain
  const question = /[?]\s*$/.test(said)

  if (SELF_HARM.test(full.plain)) return emergency(context, true)
  if (URGENT.test(full.plain) && !CARD.test(full.plain)) return emergency(context, false)
  if (REFUSED_ADD.test(said)) return { kind: 'text', text: 'De acuerdo: no apunto nada.' }
  if (CHANGE.test(said)) return { kind: 'text', text: 'No cambio ni borro nada por mi cuenta. Ábrelo en el calendario y hazlo desde ahí.', link: { to: '/calendario', label: 'Ir al calendario' } }

  const add = ADD.exec(said) ?? NEED_BUY.exec(said) ?? (question ? null : STATED.exec(said))
  if (add) {
    const rest = cut(text, 0, add[0].length)
    // «agenda», sin más, es una pregunta.
    if (rest.plain !== '' || !/^agenda\b/.test(said)) return propose(rest, context, /^(?:apuntame|anotame|ponme|tengo|recuerdame)\b/.test(said))
  }
  if (BUY.test(said) && !question) return propose(text, context, false)

  if (ADVICE.test(said)) return { kind: 'text', text: 'No puedo dar consejo médico. Consulta con un profesional o, si es urgente, llama a emergencias.', link: { to: moduleLink('emergency'), label: 'Ver emergencias' } }
  if (PHOTO.test(said)) {
    return context.canReadPhotos
      ? { kind: 'text', text: 'Abre el documento que tenga la foto y pulsa «Leer la caducidad». Te enseñaré la fecha para que la confirmes.', link: { to: moduleLink('documents'), label: 'Ir a Documentación' } }
      : { kind: 'text', text: 'La lectura de fotos no está activada. Puedes guardar la foto y escribir la caducidad a mano.', link: { to: moduleLink('documents'), label: 'Ir a Documentación' } }
  }
  if (/\b(?:caduc|vence|vencen|expira)\w*|\brenov/.test(said)) return expiry(said, context)
  if (/\balerg|\bintoleran/.test(said)) return allergies(said, context)
  if (/\bmedicacion|\bmedicament|\bpastilla|\bque toma\b/.test(said)) return medication(said, context)
  if (/\bcuantos años\b|\bque edad\b|\bedad de\b|\bcumpleaños de\b|\bcuando (?:nacio|cumple)\b|\bcuando es (?:el|mi) cumple/.test(said)) return ages(said, context)
  if (/\btelefono|\bnumero de\b|\bllamar a\b/.test(said)) return phones(said, context)
  if (/\bcompra\b|\bcomprar\b/.test(said)) return shoppingPending(context)
  if (AGENDA.test(said)) return agenda(said, context)
  if (HELP.test(full.plain) || /^(?:que (?:puedes|sabes) hacer)/.test(said)) return { kind: 'text', text: HELP_TEXT }
  if (/^(?:muchas )?gracias/.test(said)) return { kind: 'text', text: 'De nada.' }
  return { kind: 'text', text: UNKNOWN }
}
