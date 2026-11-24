import type { FamilyRecord } from '@/types/records'
import { addDays, addMonths } from '@/utils/dates'
import { occurrences } from './agenda'

/** Todo en céntimos enteros. */
export interface CategorySpending { readonly category: string; readonly spent: number; readonly limit?: number | undefined }
export interface MonthSummary { readonly income: number; readonly expense: number; readonly balance: number; readonly categories: CategorySpending[] }

const ofType = (records: readonly FamilyRecord[], typeId: string) => records.filter((r) => r.typeId === typeId)
const sum = (values: readonly number[]) => values.reduce((total, v) => total + v, 0)

function monthAmount({ data }: FamilyRecord, month: string): number {
  const from = `${month.slice(0, 7)}-01`
  const series = { start: String(data.date), repeat: (data.repeat ?? 'none') as 'none', until: data.until as string | undefined }
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
  const limits = new Map(ofType(records, 'budget').map((b) => [String(b.data.category), Number(b.data.limit)]))
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
