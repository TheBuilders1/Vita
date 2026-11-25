import { expect, test } from 'vitest'
import { buildMember, buildRecord } from '../support/builders'
import { answer, todaySummary, type ChatContext } from '@/services/chat'

const ana = buildMember('ana', 'master')
const leo = buildMember('leo', 'member', { name: 'Leo' })
const rec = (id: string, moduleId: string, typeId: string, data: Record<string, unknown>) => buildRecord({ id, moduleId: moduleId as never, typeId, data })
const records = [
  rec('wifi', 'technology', 'wifi', { name: 'Casa-5G', password: 'clave-falsa', location: 'Salón' }),
  rec('yogur', 'fridge', 'foodItem', { name: 'Yogur', quantity: 6, unit: 'unidades', place: 'fridge', expiryDate: '2026-11-25' }),
  rec('lentejas', 'fridge', 'foodItem', { name: 'Lentejas', quantity: 1, unit: 'kg', place: 'pantry' }),
  rec('nube', 'pets', 'pet', { name: 'Nube', species: 'Perra', vet: 'Clínica Sol', vetPhone: '555 000 111' }),
  rec('paga', 'kidsMoney', 'kidMovement', { member: 'leo', concept: 'Paga', kind: 'income', amount: 500, date: '2026-11-20' }),
  rec('pastilla', 'medication', 'medicationPlan', { member: 'ana', name: 'Pastilla de la tensión', dose: '1', times: ['09:00'], startDate: '2026-11-01', repeat: 'daily' }),
]
const context: ChatContext = {
  actor: ana, members: [ana, leo], records, enabled: ['technology', 'fridge', 'pets', 'kidsMoney', 'medication', 'planner'],
  today: '2026-11-24', emergencyNumber: '112', canReadPhotos: false,
}

test('la clave de la wifi', () => {
  expect(answer('¿Cuál es la clave de la wifi?', context)).toMatchObject({ kind: 'facts', facts: [{ recordId: 'wifi', title: 'Casa-5G', text: expect.stringContaining('clave-falsa') }] })
})

test('qué hay en la nevera, sin lo de la despensa', () => {
  const reply = answer('¿Qué hay en la nevera?', context)
  expect(reply).toMatchObject({ kind: 'facts', facts: [{ recordId: 'yogur' }] })
  expect(answer('¿Qué hay en casa para comer?', context)).toMatchObject({ kind: 'facts', facts: [{ recordId: 'yogur' }, { recordId: 'lentejas' }] })
})

test('el veterinario de la mascota', () => {
  expect(answer('¿Cuál es el veterinario de Nube?', context)).toMatchObject({ kind: 'facts', facts: [{ recordId: 'nube', phone: '555 000 111' }] })
})

test('cuánto tiene ahorrado un hijo', () => {
  expect(answer('¿Cuánto dinero tiene Leo?', context)).toMatchObject({ kind: 'text', text: expect.stringContaining('Leo tiene') })
})

test('«he tomado la pastilla» enseña las tomas de hoy para confirmarlas', () => {
  expect(answer('Ya me he tomado la pastilla', context)).toMatchObject({ kind: 'agenda', items: [{ category: 'medication' }] })
})

test('el resumen del día cuenta lo de hoy y lo que caduca', () => {
  expect(todaySummary(context)).toMatch(/^Hoy tienes 1 cosa/)
  expect(todaySummary(context)).toContain('Caduca pronto: Yogur.')
})
