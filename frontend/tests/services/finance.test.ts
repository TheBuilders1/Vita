import { describe, expect, test } from 'vitest'
import { goalProgress, kidBalance, monthSummary, monthTrend } from '@/services/finance'
import { buildRecord } from '../support/builders'

let n = 0
const rec = (typeId: string, moduleId: string, data: Record<string, unknown>) => buildRecord({ id: `f${++n}`, typeId, moduleId: moduleId as never, data })
const tx = (data: Record<string, unknown>) => rec('transaction', 'finances', { kind: 'expense', concept: 'x', category: 'food', ...data })

describe('resumen del mes', () => {
  const records = [
    tx({ amount: 1000, date: '2026-11-02' }), tx({ amount: 2000, date: '2026-11-30' }), tx({ amount: 900, date: '2026-12-01' }),
    tx({ amount: 500, date: '2026-01-31', repeat: 'monthly', category: 'home' }),
    tx({ kind: 'income', amount: 9000, date: '2026-11-01', category: 'salary' }),
    rec('budget', 'finances', { category: 'food', limit: 2500 }), rec('budget', 'finances', { category: 'leisure', limit: 800 }),
  ]
  test('cuadra ingresos, gastos y saldo', () => {
    expect(monthSummary(records, '2026-11-15')).toMatchObject({ income: 9000, expense: 3500, balance: 5500 })
  })
  test('agrupa por categoría con su presupuesto, de más a menos, e incluye presupuestos sin gasto', () => {
    expect(monthSummary(records, '2026-11-15').categories).toEqual([
      { category: 'food', spent: 3000, limit: 2500 }, { category: 'home', spent: 500 }, { category: 'leisure', spent: 0, limit: 800 },
    ])
  })
  test('los últimos meses salen del más antiguo al más reciente', () => {
    expect(monthTrend(records, '2026-12-10', 3)).toEqual([{ month: '2026-10-01', expense: 500 }, { month: '2026-11-01', expense: 3500 }, { month: '2026-12-01', expense: 1400 }])
  })
})

test('el progreso de un objetivo suma sus aportaciones', () => {
  const goal = rec('savingsGoal', 'savings', { name: 'Viaje', target: 1000 })
  const add = (amount: number, id = goal.id) => rec('savingsContribution', 'savings', { goal: id, amount, date: '2026-11-01' })
  expect(goalProgress(goal, [goal, add(300), add(200), add(999, 'otro')])).toEqual({ saved: 500, target: 1000, left: 500 })
  expect(goalProgress(goal, [add(1500)])).toEqual({ saved: 1500, target: 1000, left: 0 })
})

test('el dinero de cada hijo separa lo disponible de lo ahorrado', () => {
  const move = (kind: string, amount: number, extra = {}) => rec('kidMovement', 'kidsMoney', { member: 'leo', concept: 'x', kind, amount, date: '2026-11-01', ...extra })
  const records = [move('income', 1000), move('expense', 250), move('saving', 300, { goal: 'g' }), move('income', 5000, { member: 'otra' })]
  expect(kidBalance('leo', records)).toEqual({ available: 450, saved: 300 })
})
