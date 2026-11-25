import { EXPENSE_CATEGORIES } from '@/modules/finance'
import type { FamilyRecord } from '@/types/records'
import { addDays, addMonths } from '@/utils/dates'
import { formatMoney } from '@/utils/format'
import { occurrences } from './agenda'

/** Todo en céntimos enteros. */
export interface CategorySpending { readonly category: string; readonly spent: number; readonly limit?: number | undefined }
export interface MonthSummary { readonly income: number; readonly expense: number; readonly balance: number; readonly categories: CategorySpending[] }

const ofType = (records: readonly FamilyRecord[], typeId: string) => records.filter((r) => r.typeId === typeId)
const sum = (values: readonly number[]) => values.reduce((total, v) => total + v, 0)

export const categoryName = (id: string) => EXPENSE_CATEGORIES.find((c) => c.value === id)?.label ?? id

export function currentBudgets(records: readonly FamilyRecord[]): ReadonlyMap<string, FamilyRecord> {
  const ordered = ofType(records, 'budget').toSorted((a, b) =>
    a.updatedAt.localeCompare(b.updatedAt) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
  return new Map(ordered.map((record) => [String(record.data.category), record]))
}

export function budgetWarning({ spent, limit }: CategorySpending): string | undefined {
  if (limit === undefined || limit <= 0) return undefined
  if (spent > limit) return 'Has pasado el tope'
  if (spent >= limit * 0.8) return 'Te acercas al tope'
  return undefined
}

export const budgetAmounts = (spent: number, limit: number) => `${formatMoney(spent)} de ${formatMoney(limit)}`

function monthAmount({ data }: FamilyRecord, month: string): number {
  const from = `${month.slice(0, 7)}-01`
  const repeat = data.repeat === 'weekly' || data.repeat === 'monthly' || data.repeat === 'yearly' ? data.repeat : 'none'
  if (typeof data.date !== 'string') return 0
  const series: Parameters<typeof occurrences>[0] = { start: data.date, repeat, until: typeof data.until === 'string' ? data.until : undefined }
  return occurrences(series, from, addDays(addMonths(from, 1), -1)).length * Number(data.amount)
}

export function monthSummary(records: readonly FamilyRecord[], month: string): MonthSummary {
  const spending = new Map<string, number>()
  let income = 0
  for (const t of ofType(records, 'transaction')) {
    const amount = monthAmount(t, month)
    if (amount === 0) continue
    if (t.data.kind === 'income') income += amount
    else spending.set(String(t.data.category), (spending.get(String(t.data.category)) ?? 0) + amount)
  }
  const limits = new Map([...currentBudgets(records)].map(([category, b]) => [category, Number(b.data.limit)]))
  const categories = [...new Set([...spending.keys(), ...limits.keys()])]
    .map((category) => ({ category, spent: spending.get(category) ?? 0, limit: limits.get(category) }))
    .toSorted((a, b) => b.spent - a.spent)
  const expense = sum([...spending.values()])
  return { income, expense, balance: income - expense, categories }
}

export function monthTrend(records: readonly FamilyRecord[], month: string, count: number): { month: string; expense: number }[] {
  const first = `${month.slice(0, 7)}-01`
  return Array.from({ length: count }, (_, i) => {
    const current = addMonths(first, i - count + 1)
    return { month: current, expense: monthSummary(records, current).expense }
  })
}

export function goalProgress(goal: FamilyRecord, records: readonly FamilyRecord[]) {
  const saved = sum(ofType(records, 'savingsContribution').filter((c) => c.data.goal === goal.id).map((c) => Number(c.data.amount)))
  const target = Number(goal.data.target)
  return { saved, target, left: Math.max(0, target - saved) }
}

export function kidBalance(memberId: string, records: readonly FamilyRecord[]) {
  const moves = ofType(records, 'kidMovement').filter((m) => m.data.member === memberId)
  const total = (kind: string) => sum(moves.filter((m) => m.data.kind === kind).map((m) => Number(m.data.amount)))
  return { available: total('income') - total('expense') - total('saving'), saved: total('saving') }
}

export const kidGoalSaved = (goalId: string, records: readonly FamilyRecord[]) =>
  sum(ofType(records, 'kidMovement').filter((m) => m.data.goal === goalId && m.data.kind === 'saving').map((m) => Number(m.data.amount)))

export function goalEstimate(target: number, saved: number, weekly: number) {
  const left = Math.max(0, target - saved)
  return { left, weeks: left === 0 ? 0 : weekly > 0 ? Math.ceil(left / weekly) : null }
}

export function activeAllowances(memberId: string, records: readonly FamilyRecord[], today: string) {
  const active = ofType(records, 'allowance').filter(({ data }) => data.member === memberId &&
    String(data.startDate) <= today && (!data.endDate || String(data.endDate) >= today))
  const amount = (repeat: string) => sum(active.filter(({ data }) => data.repeat === repeat).map(({ data }) => Number(data.amount)))
  return { weekly: amount('weekly'), monthly: amount('monthly') }
}

export function weeklyGoalSavings(goalId: string, records: readonly FamilyRecord[], today: string) {
  const from = addDays(today, -27)
  const recent = records.filter(({ data }) => typeof data.date === 'string' && data.date >= from && data.date <= today)
  return kidGoalSaved(goalId, recent) / 4
}

export interface QuarterMonth { readonly month: string; readonly income: number; readonly expense: number; readonly balance: number }
export interface QuarterReport {
  readonly year: number
  readonly quarter: 1 | 2 | 3 | 4
  readonly months: readonly QuarterMonth[]
  readonly income: number
  readonly expense: number
  readonly balance: number
  /** Porcentaje de los ingresos que queda; sin ingresos no tiene sentido. */
  readonly savingRate: number | null
  readonly categories: readonly { readonly category: string; readonly spent: number; readonly share: number }[]
  readonly reading: readonly string[]
}

const monthName = new Intl.DateTimeFormat('es-ES', { month: 'long', timeZone: 'UTC' })
export const monthLabel = (iso: string) => {
  const name = monthName.format(new Date(`${iso.slice(0, 7)}-01T00:00:00Z`))
  return name.charAt(0).toUpperCase() + name.slice(1)
}

/** El trimestre natural que contiene `day`, con la misma cuenta que el resumen del mes. Los meses posteriores a `today` aún no han pasado: no cuentan. */
export function quarterReport(records: readonly FamilyRecord[], day: string, today = day): QuarterReport {
  const year = Number(day.slice(0, 4))
  const quarter = (Math.floor((Number(day.slice(5, 7)) - 1) / 3) + 1) as QuarterReport['quarter']
  const first = `${year}-${String(quarter * 3 - 2).padStart(2, '0')}-01`
  const summaries = [0, 1, 2].map((i) => addMonths(first, i)).filter((month) => month.slice(0, 7) <= today.slice(0, 7))
    .map((month) => ({ month, ...monthSummary(records, month) }))
  const spending = new Map<string, number>()
  for (const s of summaries) for (const c of s.categories) spending.set(c.category, (spending.get(c.category) ?? 0) + c.spent)
  const income = sum(summaries.map((s) => s.income))
  const expense = sum(summaries.map((s) => s.expense))
  const balance = income - expense
  const categories = [...spending].filter(([, spent]) => spent > 0).toSorted((a, b) => b[1] - a[1])
    .map(([category, spent]) => ({ category, spent, share: Math.round((spent / expense) * 100) }))
  const savingRate = income > 0 ? Math.round((balance / income) * 100) : null
  const reading: string[] = []
  if (income === 0 && expense === 0) reading.push('No hay movimientos apuntados en este trimestre.')
  else {
    reading.push(savingRate === null ? 'No hay ingresos apuntados en este trimestre.'
      : balance >= 0 ? `Balance positivo: se conserva el ${savingRate} % de los ingresos.`
      : `Balance negativo: se ha gastado ${formatMoney(-balance)} más de lo que ha entrado.`)
    const top = categories[0]
    const peak = summaries.toSorted((a, b) => b.expense - a.expense)[0]
    // Lo que sube más de un 10 % frente al trimestre anterior: suele ser un recibo que conviene revisar.
    const before = new Map<string, number>()
    for (const i of [-3, -2, -1]) for (const c of monthSummary(records, addMonths(first, i)).categories) before.set(c.category, (before.get(c.category) ?? 0) + c.spent)
    for (const c of categories) {
      const previous = before.get(c.category) ?? 0
      const rise = previous > 0 ? Math.round(((c.spent - previous) / previous) * 100) : 0
      if (rise > 10) reading.push(`${categoryName(c.category)} ha subido un ${rise} % respecto al trimestre anterior.`)
    }
    if (top && peak && peak.expense > 0) reading.push(`${categoryName(top.category)} concentra el ${top.share} % del gasto. ${monthLabel(peak.month)} es el mes con más gasto.`)
  }
  return { year, quarter, months: summaries.map(({ month, income: i, expense: e, balance: b }) => ({ month, income: i, expense: e, balance: b })), income, expense, balance, savingRate, categories, reading }
}
