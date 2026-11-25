import { expect, it } from 'vitest'
import { buildRecord } from '../support/builders'
import { activeAllowances, goalEstimate, weeklyGoalSavings } from '@/services/finance'

const saving = (date: string, goal: string) => buildRecord({ typeId: 'kidMovement', data: { date, goal, kind: 'saving', amount: 1000 } })
const pay = (member: string, startDate: string, endDate?: string) => buildRecord({ typeId: 'allowance', data: { member, startDate, endDate, repeat: 'monthly', amount: 1200 } })

it.each([
  [5000, 3100, 500, { left: 1900, weeks: 4 }],
  [5000, 5100, 500, { left: 0, weeks: 0 }],
  [5000, 0, 0, { left: 5000, weeks: null }],
])('calcula cuánto falta y redondea las semanas hacia arriba', (target, saved, weekly, expected) => {
  expect(goalEstimate(target, saved, weekly)).toEqual(expected)
})

it('cuenta solo lo apartado para esa meta en las últimas cuatro semanas', () => {
  const records = [saving('2026-11-25', 'bike'), saving('2026-10-29', 'bike'), saving('2026-10-28', 'bike'), saving('2026-11-26', 'bike'), saving('2026-11-20', 'trip')]
  expect(weeklyGoalSavings('bike', records, '2026-11-25')).toBe(500)
})

it('suma solo las pagas vigentes de la persona', () => {
  const records = [pay('leo', '2026-11-25'), pay('leo', '2026-11-26'), pay('leo', '2026-01-01', '2026-11-24'), pay('ana', '2026-11-01')]
  expect(activeAllowances('leo', records, '2026-11-25')).toEqual({ weekly: 0, monthly: 1200 })
})
