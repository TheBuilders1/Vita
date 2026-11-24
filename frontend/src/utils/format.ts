import { diffDays } from './dates'

const LOCALE = 'es-ES'
const date = (iso: string) => new Date(`${iso}T12:00:00`)
const money = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'EUR', useGrouping: 'always' })
const longDay = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' })
const fullDate = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' })
const month = new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric' })

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

export const formatMoney = (cents: number) => money.format(cents / 100)
export const formatDay = (iso: string) => capitalize(longDay.format(date(iso)))
export const formatDate = (iso: string) => fullDate.format(date(iso))
/** «Hoy», «Mañana» y «Ayer» se entienden antes que una fecha. */
export function formatNear(iso: string, today: string): string {
  const near: Record<number, string> = { [-1]: 'Ayer', 0: 'Hoy', 1: 'Mañana' }
  return near[diffDays(today, iso)] ?? formatDay(iso)
}
export const formatMonth = (iso: string) => capitalize(month.format(date(iso)))
export const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const

export function formatBytes(bytes: number): string {
  const units = ['B', 'kB', 'MB', 'GB', 'TB']
  let value = bytes
  let unit = 0
  while (value >= 1000 && unit < units.length - 1) { value /= 1000; unit++ }
  return `${value.toLocaleString(LOCALE, { maximumFractionDigits: unit === 0 ? 0 : 1 })} ${units[unit]}`
}
