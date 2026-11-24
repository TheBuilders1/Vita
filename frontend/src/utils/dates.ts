/** Fechas como texto local 'AAAA-MM-DD' y horas 'HH:mm': no dependen de la zona horaria. */
export type AgeBand = 'youth' | 'youngAdult' | 'adult'

const pad = (n: number) => String(n).padStart(2, '0')

export function isIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const [year, month, day] = match.slice(1).map(Number) as [number, number, number]
  const date = new Date(Date.UTC(year, month - 1, day))
  // Date corrige fechas imposibles (30 de febrero → 2 de marzo): si cambia, no era real.
  return date.getUTCFullYear() === year && date.getUTCDate() === day
}

export function isTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

/** Fecha local de hoy. No usa toISOString porque devolvería el día en UTC. */
export function todayIso(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function ageOn(birthDate: string, today: string): number {
  const years = Number(today.slice(0, 4)) - Number(birthDate.slice(0, 4))
  return today.slice(5) < birthDate.slice(5) ? years - 1 : years
}

/** Las franjas cubren todas las edades; el encargo dejaba sin definir 19 y 35-39. */
export function resolveAgeBand(age: number): AgeBand {
  if (age <= 18) return 'youth'
  return age < 40 ? 'youngAdult' : 'adult'
}

/** Los cálculos usan UTC para que el cambio de hora no sume ni quite días. */
const toUtc = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)))
const fromUtc = (ms: number) => new Date(ms).toISOString().slice(0, 10)
const DAY_MS = 86_400_000

export const addDays = (iso: string, days: number) => fromUtc(toUtc(iso) + days * DAY_MS)
export const diffDays = (from: string, to: string) => Math.round((toUtc(to) - toUtc(from)) / DAY_MS)

/** Si el día no existe en el mes de destino, usa el último. */
export function addMonths(iso: string, months: number): string {
  const total = Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7)) - 1 + months
  const [year, month] = [Math.floor(total / 12), total % 12]
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return fromUtc(Date.UTC(year, month, Math.min(Number(iso.slice(8, 10)), lastDay)))
}

/** 1 = lunes … 7 = domingo. */
export const weekdayOf = (iso: string) => new Date(toUtc(iso)).getUTCDay() || 7
export const startOfWeek = (iso: string) => addDays(iso, 1 - weekdayOf(iso))
export const weekDays = (iso: string) => Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(iso), i))

export function monthWeeks(iso: string): string[][] {
  const first = `${iso.slice(0, 7)}-01`
  const last = addDays(addMonths(first, 1), -1)
  const weeks: string[][] = []
  for (let day = startOfWeek(first); day <= last; day = addDays(day, 7)) weeks.push(weekDays(day))
  return weeks
}
