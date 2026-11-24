import { beforeEach, describe, expect, test } from 'vitest'
import { loadDemo } from '@/data/demo'
import { VitaDb } from '@/database/db'
import { createRepositories } from '@/database/repositories'
import { buildAttention } from '@/services/attention'
import { ageOn } from '@/utils/dates'

const today = '2026-11-24'
let n = 0
async function open(day = today) {
  const db = new VitaDb(`vita-demo-${++n}`)
  const repos = createRepositories(db, () => new Date(`${day}T10:00:00`))
  await loadDemo(db, repos, day)
  const members = await repos.family.listMembers()
  const master = members.find((m) => m.role === 'master')!
  return { db, repos, members, master, records: await repos.records.list(master.id) }
}
let demo: Awaited<ReturnType<typeof open>>
beforeEach(async () => { demo = await open() })

test('hay adultos, un hijo, una persona mayor y una mascota', () => {
  const ages = demo.members.map((m) => ageOn(m.birthDate, today))
  expect(ages.filter((a) => a >= 18 && a < 70).length).toBeGreaterThanOrEqual(2)
  expect(ages.filter((a) => a < 18)).toHaveLength(1)
  expect(ages.filter((a) => a >= 70)).toHaveLength(1)
  expect(demo.records.filter((r) => r.typeId === 'pet')).toHaveLength(1)
  expect(new Set(demo.members.map((m) => m.role))).toEqual(new Set(['master', 'member', 'vulnerable']))
})

test.each(['appointment', 'dentalVisit', 'schoolEvent', 'task', 'medicationPlan', 'shoppingItem', 'savingsGoal', 'transaction', 'outing', 'document', 'emergencyCard', 'recipe', 'foodItem', 'dietNeed'])('incluye %s', (typeId) => {
  expect(demo.records.some((r) => r.typeId === typeId)).toBe(true)
})

test('todos los módulos de planta tienen algún registro', () => {
  expect(new Set(demo.records.map((r) => r.moduleId)).size).toBe(25)
})

test('se marca como demostración', async () => {
  expect(await demo.repos.family.get()).toMatchObject({ isDemo: true })
})

test('un documento caduca pronto y hay citas y medicación que atender, sea cual sea el día', async () => {
  for (const day of [today, '2027-02-28', '2028-02-29', '2026-12-31']) {
    const d = await open(day)
    const items = buildAttention({ records: d.records, members: d.members, today: day })
    const types = new Set(items.map((i) => i.item.typeId))
    expect([...types], day).toEqual(expect.arrayContaining(['document', 'appointment', 'medicationPlan', 'task']))
  }
})

test('la alergia de la ficha de emergencia coincide con la dieta', () => {
  const need = demo.records.find((r) => r.typeId === 'dietNeed' && r.data.kind === 'allergy')!
  const card = demo.records.find((r) => r.typeId === 'emergencyCard' && r.data.member === need.data.member)!
  expect(String(card.data.allergies).toLowerCase()).toContain('frutos')
})

describe('si ya hay una familia', () => {
  test('no se mezcla con ella', async () => {
    const before = await demo.db.records.count()
    await expect(loadDemo(demo.db, demo.repos, today)).rejects.toThrow('Ya hay una familia')
    expect(await demo.db.records.count()).toBe(before)
  })
})
