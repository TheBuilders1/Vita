import { addDays, addMonths, isIsoDate, weekdayOf } from '@/utils/dates'
import { formatDate } from '@/utils/format'

/** Lo escrito y su versión sin tildes ni mayúsculas, carácter a carácter: los cortes valen para los dos. */
export interface Phrase { readonly plain: string; readonly raw: string }

const plainChar = (c: string) => {
  const lower = c.toLowerCase()
  if (lower === 'ñ') return lower
  const base = lower.normalize('NFD').replace(/\p{Diacritic}/gu, '')
  return base.length === 1 ? base : '?'
}

export function phrase(text: string): Phrase {
  // Por unidades UTF-16: un emoji ocupa dos y debe seguir ocupando dos.
  const raw = text.normalize('NFC').replace(/\s+/g, ' ').trim()
  return { raw, plain: raw.split('').map(plainChar).join('') }
}
export const plain = (text: string) => phrase(text).plain

/** Mismos recortes en los dos textos: solo tocan espacios y signos, que son iguales en ambos. */
const squeeze = (text: string) => text.replace(/ {2,}/g, ' ').replace(/ +([,.;])/g, '$1').trim()
export function cut({ plain: p, raw }: Phrase, start: number, end: number): Phrase {
  return { plain: squeeze(`${p.slice(0, start)} ${p.slice(end)}`), raw: squeeze(`${raw.slice(0, start)} ${raw.slice(end)}`) }
}
/** Quita lo que casa con el patrón. */
export function without(text: Phrase, pattern: RegExp): Phrase {
  const match = pattern.exec(text.plain)
  return match ? cut(text, match.index, match.index + match[0].length) : text
}

const WEEKDAYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const NUMBERS: Readonly<Record<string, number>> = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12 }
const NUMBER = `\\d{1,2}|${Object.keys(NUMBERS).join('|')}`
const numberOf = (text: string) => NUMBERS[text] ?? Number(text)
const pad = (n: number) => String(n).padStart(2, '0')
const DAY = `(?:${WEEKDAYS.join('|')})`

export interface Found { readonly value?: string; readonly problem?: string; readonly text: Phrase }

function resolveDate(day: number, month: number, year: number | undefined, today: string): string | undefined {
  if (year !== undefined) {
    const iso = `${year < 100 ? 2000 + year : year}-${pad(month)}-${pad(day)}`
    return isIsoDate(iso) ? iso : undefined
  }
  // Sin año es la próxima vez que llegue; el margen cubre el 29 de febrero.
  for (let y = Number(today.slice(0, 4)), tries = 0; tries <= 8; tries++, y++) {
    const iso = `${y}-${pad(month)}-${pad(day)}`
    if (isIsoDate(iso) && iso >= today) return iso
  }
  return undefined
}

function calendarDate(text: Phrase, match: RegExpExecArray, [weekday, day, month, year]: readonly [string | undefined, number, number, number | undefined], today: string): Found {
  const rest = cut(text, match.index, match.index + match[0].length)
  const value = resolveDate(day, month, year, today)
  if (value === undefined) return { text: rest, problem: `La fecha «${match[0].trim().replace(/^el /, '')}» no existe` }
  const real = WEEKDAYS[weekdayOf(value) - 1]!
  return weekday && weekday !== real ? { text: rest, value, problem: `El ${formatDate(value)} es ${real}, no ${weekday}` } : { text: rest, value }
}

const RULES: readonly ((text: Phrase, today: string) => Found | undefined)[] = [
  (text, today) => {
    const m = new RegExp(`\\b(?:el )?(?:(${DAY}),? )?(?:dia )?(\\d{1,2}) de (${MONTHS.join('|')})(?: del? (\\d{4}))?\\b`).exec(text.plain)
    return m ? calendarDate(text, m, [m[1], Number(m[2]), MONTHS.indexOf(m[3]!) + 1, m[4] ? Number(m[4]) : undefined], today) : undefined
  },
  (text, today) => {
    const m = new RegExp(`\\b(?:el )?(?:(${DAY}),? )?(\\d{1,2})[/-](\\d{1,2})(?:[/-](\\d{4}|\\d{2}))?\\b`).exec(text.plain)
    return m ? calendarDate(text, m, [m[1], Number(m[2]), Number(m[3]), m[4] ? Number(m[4]) : undefined], today) : undefined
  },
  (text, today) => {
    const m = /\b(?:el )?dia (\d{1,2})\b/.exec(text.plain)
    if (!m) return undefined
    const rest = cut(text, m.index, m.index + m[0].length)
    for (let k = 0; k <= 12; k++) {
      const value = `${addMonths(`${today.slice(0, 7)}-01`, k).slice(0, 7)}-${pad(Number(m[1]))}`
      if (isIsoDate(value) && value >= today) return { text: rest, value }
    }
    return { text: rest, problem: `El día ${m[1]} no existe` }
  },
  (text, today) => {
    const m = new RegExp(`\\b(?:en|dentro de) (${NUMBER}) (dia|semana|mes)(?:e?s)?\\b`).exec(text.plain)
    if (!m) return undefined
    const n = numberOf(m[1]!)
    return { text: cut(text, m.index, m.index + m[0].length), value: m[2] === 'mes' ? addMonths(today, n) : addDays(today, m[2] === 'semana' ? n * 7 : n) }
  },
  (text, today) => {
    // «por la mañana» es un momento del día, no el día siguiente.
    const m = /\b(pasado mañana|(?<!\bla )mañana|hoy|esta (?:noche|tarde|mañana))\b/.exec(text.plain)
    if (!m) return undefined
    const days = m[1] === 'pasado mañana' ? 2 : m[1] === 'mañana' ? 1 : 0
    return { text: cut(text, m.index, m.index + m[0].length), value: addDays(today, days) }
  },
  (text, today) => {
    const m = new RegExp(`\\b(?:(?:el|este) )?(?:proximo )?(${DAY})(?: que viene| proximo)?\\b`).exec(text.plain)
    if (!m) return undefined
    const ahead = (WEEKDAYS.indexOf(m[1]!) + 1 - weekdayOf(today) + 7) % 7
    return { text: cut(text, m.index, m.index + m[0].length), value: addDays(today, ahead === 0 ? 7 : ahead) }
  },
]

export function findDate(text: Phrase, today: string): Found {
  for (const rule of RULES) {
    const found = rule(text, today)
    if (found) return found
  }
  return { text }
}

const FRACTIONS: Readonly<Record<string, number>> = { media: 30, cuarto: 15 }
const minutesOf = (text: string) => FRACTIONS[text] ?? numberOf(text)
const CLOCK = new RegExp(`\\b(?:a|sobre|desde) las? (${NUMBER})(?:[:.h](\\d{2}))?(?: ?h(?:oras)?\\b)?(?: (y|menos) (media|cuarto|${NUMBER})\\b)?(?: en punto)?(?: (?:de|por) la (mañana|tarde|noche|madrugada))?(?![\\d:])`)
const BARE = /\b(\d{1,2}):(\d{2})\b/

export function findTime(text: Phrase): Found {
  const noon = /\b(?:al?|a) (mediodia|medianoche)\b/.exec(text.plain)
  if (noon) return { text: cut(text, noon.index, noon.index + noon[0].length), value: noon[1] === 'mediodia' ? '12:00' : '00:00' }
  const m = CLOCK.exec(text.plain) ?? BARE.exec(text.plain)
  if (!m) return { text }
  const rest = cut(text, m.index, m.index + m[0].length)
  const [, hourText, exact, direction, amount, period] = m
  let hour = numberOf(hourText!)
  let minute = exact ? Number(exact) : 0
  if (hour > 23 || minute > 59) return { text: rest, problem: `La hora «${m[0].replace(/^\D*/, '')}» no existe` }
  if ((period === 'tarde' || period === 'noche') && hour < 12) hour += 12
  else if (period === 'noche' && hour === 12) hour = 0
  // Nadie suele quedar a las cinco de la madrugada: se propone la tarde y se dice.
  const guessed = period === undefined && hour >= 1 && hour <= 7
  if (guessed) hour += 12
  const shift = amount === undefined ? 0 : minutesOf(amount) * (direction === 'menos' ? -1 : 1)
  const total = (hour * 60 + minute + shift + 1440) % 1440
  hour = Math.floor(total / 60)
  minute = total % 60
  const value = `${pad(hour)}:${pad(minute)}`
  return guessed ? { text: rest, value, problem: `He entendido las ${value}. Cámbialo si es por la mañana.` } : { text: rest, value }
}

export function extractDate(text: string, today: string): { rest: string; date?: string; problem?: string } {
  const { value, problem, text: rest } = findDate({ plain: text, raw: text }, today)
  return { rest: rest.plain, ...(value !== undefined && { date: value }), ...(problem !== undefined && { problem }) }
}
export function extractTime(text: string): { rest: string; time?: string; problem?: string } {
  const { value, problem, text: rest } = findTime({ plain: text, raw: text })
  return { rest: rest.plain, ...(value !== undefined && { time: value }), ...(problem !== undefined && { problem }) }
}
