import { beforeEach, describe, expect, test } from 'vitest'
import { ValidationError } from '@/services/errors'
import { openTestHome } from '../support/database'

let home: Awaited<ReturnType<typeof openTestHome>>
beforeEach(async () => { home = await openTestHome() })

const task = (data: Record<string, unknown> = {}) => ({ typeId: 'task', data: { title: 'Comprar pan', ...data } })

describe('crear y consultar', () => {
  test('guarda el registro normalizado con su autor y protagonistas', async () => {
    const created = await home.records.create(home.andres, task({ title: '  Comprar pan ', members: [home.pilar] }))
    expect(await home.records.get(home.marta, created.id)).toEqual({
      id: created.id, typeId: 'task', moduleId: 'planner', ownerId: home.andres, subjectIds: [home.pilar],
      visibility: 'family', sharedWith: [], data: { title: 'Comprar pan', members: [home.pilar], done: false },
      createdAt: '2026-11-24T09:00:00.000Z', updatedAt: '2026-11-24T09:00:00.000Z',
    })
  })
  test('los errores de formulario indican el campo', async () => {
    const error = await home.records.create(home.andres, task({ title: '', dueDate: '2026-02-30' })).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ValidationError)
    expect((error as ValidationError).fields).toEqual({ title: 'Este dato es obligatorio', dueDate: 'La fecha no es válida' })
    expect(await home.db.records.count()).toBe(0)
  })
  test('no admite personas ni registros inexistentes', async () => {
    await expect(home.records.create(home.marta, task({ members: ['fantasma'] }))).rejects.toThrow('Esa persona ya no está en la familia')
    await expect(home.records.create(home.marta, { typeId: 'shoppingItem', data: { name: 'Pan', list: 'nada' } })).rejects.toThrow('El elemento elegido ya no existe')
  })
  test('una referencia debe ser del tipo correcto', async () => {
    const other = await home.records.create(home.marta, task())
    await expect(home.records.create(home.marta, { typeId: 'shoppingItem', data: { name: 'Pan', list: other.id } })).rejects.toThrow('El elemento elegido ya no existe')
  })
  test('no se puede enlazar un registro que no se puede ver', async () => {
    const plan = await home.records.create(home.marta, { typeId: 'medicationPlan', data: { member: home.pilar, name: 'A', dose: '1', times: ['09:00'], startDate: '2026-11-01' } })
    await expect(home.records.create(home.andres, { typeId: 'medicationIntake', data: { member: home.andres, plan: plan.id, date: '2026-11-24', time: '09:00', status: 'taken' } }))
      .rejects.toThrow('El elemento elegido ya no existe')
  })
  test('nace con la visibilidad de su tipo', async () => {
    const r = await home.records.create(home.marta, { typeId: 'document', data: { title: 'DNI', kind: 'id', member: home.pilar } })
    expect(r.visibility).toBe('restricted')
  })
  test('las listas solo devuelven lo que cada cual puede ver', async () => {
    await home.records.create(home.marta, { typeId: 'document', data: { title: 'DNI Pilar', kind: 'id', member: home.pilar } })
    await home.records.create(home.marta, { typeId: 'document', data: { title: 'Contrato', kind: 'contract' } })
    const titles = async (who: string) => (await home.records.list(who, { typeId: 'document' })).map((r) => r.data.title).toSorted()
    expect(await titles(home.marta)).toEqual(['Contrato', 'DNI Pilar'])
    expect(await titles(home.pilar)).toEqual(['DNI Pilar'])
    expect(await titles(home.andres)).toEqual([])
  })
  test('se listan por módulo o todos', async () => {
    await home.records.create(home.marta, task())
    await home.records.create(home.marta, { typeId: 'event', data: { title: 'Cena', date: '2026-12-24' } })
    await home.records.create(home.marta, { typeId: 'shoppingList', data: { name: 'Casa' } })
    expect(await home.records.list(home.marta, { moduleId: 'planner' })).toHaveLength(2)
    expect(await home.records.list(home.marta)).toHaveLength(3)
  })
  test('lo ajeno no visible parece inexistente', async () => {
    const secret = await home.records.create(home.andres, { ...task(), visibility: 'private' })
    expect(await home.records.get(home.marta, secret.id)).toBeUndefined()
    await expect(home.records.update(home.marta, secret.id, { data: { title: 'x' } })).rejects.toThrow('Ese registro ya no existe')
  })
})

describe('visibilidad', () => {
  test('la ficha de emergencia es siempre familiar', async () => {
    await expect(home.records.create(home.marta, { typeId: 'emergencyCard', data: { member: home.pilar }, visibility: 'private' }))
      .rejects.toThrow('La visibilidad de este registro no se puede cambiar')
  })
  test('solo el autor puede volver privado un registro', async () => {
    const r = await home.records.create(home.andres, task())
    await expect(home.records.update(home.marta, r.id, { visibility: 'private' })).rejects.toThrow('Solo quien lo creó puede hacerlo privado')
    await home.records.update(home.andres, r.id, { visibility: 'private' })
    expect(await home.records.get(home.marta, r.id)).toBeUndefined()
  })
  test('compartir da acceso y exige personas reales', async () => {
    const r = await home.records.create(home.marta, { typeId: 'document', data: { title: 'Seguro', kind: 'insurance' } })
    await home.records.update(home.marta, r.id, { sharedWith: [home.andres, home.andres] })
    expect(await home.records.get(home.andres, r.id)).toMatchObject({ sharedWith: [home.andres] })
    await expect(home.records.update(home.marta, r.id, { sharedWith: ['fantasma'] })).rejects.toThrow('Esa persona ya no está en la familia')
  })
})

describe('modificar', () => {
  test('actualiza datos, protagonistas y fecha de cambio', async () => {
    const r = await home.records.create(home.andres, task({ members: [home.andres] }))
    home.clock.now = new Date('2026-11-24T10:00:00.000Z')
    await home.records.update(home.andres, r.id, { data: { title: 'Pan integral', members: [home.nora] } })
    expect(await home.db.records.get(r.id)).toMatchObject({ subjectIds: [home.nora], data: { title: 'Pan integral' }, createdAt: '2026-11-24T09:00:00.000Z', updatedAt: '2026-11-24T10:00:00.000Z' })
  })
  test('un miembro no cambia lo de otro', async () => {
    const r = await home.records.create(home.marta, task())
    await expect(home.records.update(home.andres, r.id, { data: { title: 'x' } })).rejects.toThrow('No tienes permiso')
  })
  test('quien solo anota lo suyo no puede pasarlo a otra persona', async () => {
    const plan = await home.records.create(home.marta, { typeId: 'medicationPlan', data: { member: home.pilar, name: 'A', dose: '1', times: ['09:00'], startDate: '2026-11-01' } })
    const data = { member: home.pilar, plan: plan.id, date: '2026-11-24', time: '09:00', status: 'taken' }
    const intake = await home.records.create(home.pilar, { typeId: 'medicationIntake', data })
    await expect(home.records.update(home.pilar, intake.id, { data: { ...data, member: home.marta } })).rejects.toThrow('No tienes permiso')
  })
  test('completar no exige ser el autor, solo el responsable', async () => {
    const r = await home.records.create(home.marta, task({ members: [home.pilar] }))
    await expect(home.records.setDone(home.andres, r.id, true)).rejects.toThrow('No tienes permiso')
    await home.records.setDone(home.pilar, r.id, true)
    expect((await home.db.records.get(r.id))?.data.done).toBe(true)
  })
})

describe('eliminar', () => {
  test('borra en cascada lo que dependía de él y avisa antes de cuánto es', async () => {
    const list = await home.records.create(home.marta, { typeId: 'shoppingList', data: { name: 'Casa' } })
    await home.records.create(home.andres, { typeId: 'shoppingItem', data: { name: 'Pan', list: list.id } })
    await home.records.create(home.andres, { typeId: 'shoppingItem', data: { name: 'Leche', list: list.id } })
    expect(await home.records.previewRemoval(home.marta, list.id)).toEqual({ removed: 3, changed: 0 })
    await home.records.remove(home.marta, list.id)
    expect(await home.db.records.count()).toBe(0)
  })
  test('una referencia opcional se suelta', async () => {
    const goal = await home.records.create(home.marta, { typeId: 'kidGoal', data: { member: home.nora, name: 'Bici', target: 9000 } })
    const move = await home.records.create(home.nora, { typeId: 'kidMovement', data: { member: home.nora, concept: 'Hucha', kind: 'saving', amount: 500, date: '2026-11-20', goal: goal.id } })
    await home.records.remove(home.marta, goal.id)
    expect((await home.db.records.get(move.id))?.data).not.toHaveProperty('goal')
  })
  test('si al soltarla el registro deja de tener sentido, se borra', async () => {
    const recipe = await home.records.create(home.marta, { typeId: 'recipe', data: { title: 'Lentejas', minutes: 50, ingredients: [{ name: 'Lentejas' }] } })
    const onlyRecipe = await home.records.create(home.marta, { typeId: 'mealPlan', data: { date: '2026-11-25', meal: 'lunch', recipe: recipe.id } })
    const withDish = await home.records.create(home.marta, { typeId: 'mealPlan', data: { date: '2026-11-26', meal: 'lunch', recipe: recipe.id, dish: 'Lentejas de ayer' } })
    await home.records.remove(home.marta, recipe.id)
    expect(await home.db.records.get(onlyRecipe.id)).toBeUndefined()
    expect((await home.db.records.get(withDish.id))?.data).toMatchObject({ dish: 'Lentejas de ayer' })
  })
  test('un miembro no borra lo de otro', async () => {
    const r = await home.records.create(home.marta, task())
    await expect(home.records.remove(home.andres, r.id)).rejects.toThrow('No tienes permiso')
    expect(await home.db.records.count()).toBe(1)
  })
})
