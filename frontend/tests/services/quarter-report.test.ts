import { expect, test } from 'vitest'
import { quarterReport } from '@/services/finance'
import { buildRecord } from '../support/builders'

let n = 0
const tx = (data: Record<string, unknown>) => buildRecord({ id: `q${++n}`, typeId: 'transaction', moduleId: 'finances', data: { kind: 'expense', concept: 'x', category: 'food', ...data } })

const records = [
  tx({ kind: 'income', amount: 300000, date: '2026-07-01', repeat: 'monthly', category: 'salary' }),
  tx({ amount: 90000, date: '2026-07-01', repeat: 'monthly', category: 'home' }),
  tx({ amount: 45000, date: '2026-07-10' }),
  tx({ amount: 60000, date: '2026-08-12' }),
  tx({ amount: 30000, date: '2026-09-03', category: 'health' }),
  tx({ amount: 99999, date: '2026-10-01', category: 'leisure' }),
]

test('el trimestre suma sus tres meses y nada de fuera', () => {
  const report = quarterReport(records, '2026-08-20', '2026-12-31')
  expect(report).toMatchObject({ year: 2026, quarter: 3, income: 900000, expense: 405000, balance: 495000, savingRate: 55 })
  expect(report.months.map((m) => [m.month, m.expense])).toEqual([['2026-07-01', 135000], ['2026-08-01', 150000], ['2026-09-01', 120000]])
})

test('las categorías van de más a menos con su parte del gasto', () => {
  expect(quarterReport(records, '2026-09-30').categories).toEqual([
    { category: 'home', spent: 270000, share: 67 }, { category: 'food', spent: 105000, share: 26 }, { category: 'health', spent: 30000, share: 7 },
  ])
})

test('la lectura dice el saldo, la categoría principal y el mes de más gasto', () => {
  expect(quarterReport(records, '2026-07-01', '2026-12-31').reading).toEqual([
    'Balance positivo: se conserva el 55 % de los ingresos.',
    'Vivienda concentra el 67 % del gasto. Agosto es el mes con más gasto.',
  ])
})

test('sin movimientos no inventa nada', () => {
  const report = quarterReport([], '2026-02-01')
  expect(report).toMatchObject({ quarter: 1, income: 0, expense: 0, savingRate: null, categories: [] })
  expect(report.reading).toEqual(['No hay movimientos apuntados en este trimestre.'])
})

test('un trimestre en curso solo cuenta los meses que ya han empezado', () => {
  const report = quarterReport(records, '2026-07-01', '2026-08-05')
  expect(report.months.map((m) => m.month)).toEqual(['2026-07-01', '2026-08-01'])
  expect(report.expense).toBe(285000)
})

test('avisa de lo que ha subido respecto al trimestre anterior', () => {
  const light = (amount: number, date: string) => tx({ amount, date, category: 'home', concept: 'Luz' })
  const report = quarterReport([light(10000, '2026-05-01'), light(10000, '2026-08-01')], '2026-08-01', '2026-12-31')
  expect(report.reading).not.toContainEqual(expect.stringContaining('ha subido'))
  const higher = quarterReport([light(10000, '2026-05-01'), light(13000, '2026-08-01')], '2026-08-01', '2026-12-31')
  expect(higher.reading).toContain('Vivienda ha subido un 30 % respecto al trimestre anterior.')
})
