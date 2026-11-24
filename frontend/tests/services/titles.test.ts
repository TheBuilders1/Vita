import { expect, test } from 'vitest'
import { fieldText, recordTitle, titleContext } from '@/services/titles'
import { buildMember, buildRecord } from '../support/builders'

const leo = buildMember('leo', 'member', { name: 'Leo' })
const rec = (typeId: string, moduleId: string, data: Record<string, unknown>) => buildRecord({ id: typeId, typeId, moduleId: moduleId as never, data })
const title = (typeId: string, moduleId: string, data: Record<string, unknown>) => recordTitle(rec(typeId, moduleId, data), titleContext([leo], []))

test('los registros que se titulan con una persona dicen qué son', () => {
  expect(title('allowance', 'kidsMoney', { member: 'leo', amount: 500, repeat: 'weekly', startDate: '2026-11-01' })).toBe('Paga de Leo')
  expect(title('emergencyCard', 'emergency', { member: 'leo' })).toBe('Ficha de Leo')
})
test('fechas, importes y opciones se leen como texto', () => {
  expect(title('savingsContribution', 'savings', { goal: 'g', amount: 2250, date: '2026-11-01' })).toMatch(/^22,50\s€$/)
  expect(title('budget', 'finances', { category: 'food', limit: 100 })).toBe('Alimentación')
  expect(title('careLog', 'care', { member: 'leo', routine: 'x', date: '2026-11-01', time: '09:00' })).toBe('1 de noviembre de 2026')
})
test('quien ya no está se nombra sin romper nada', () => {
  expect(fieldText(rec('task', 'planner', { title: 'x', members: ['nadie', 'leo'] }), 'members', titleContext([leo], []))).toBe('Antiguo integrante, Leo')
})
