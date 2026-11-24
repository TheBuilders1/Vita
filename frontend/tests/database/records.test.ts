import { beforeEach, describe, expect, test } from 'vitest'
import { RECORD_TYPES } from '@/modules/registry'
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
    await expect(home.records.create(home.marta, task({ members: ['fantasma'] }))).rejects.toThrow('Esa persona ya no está en el hogar')
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
    await expect(home.records.update(home.marta, r.id, { sharedWith: ['fantasma'] })).rejects.toThrow('Esa persona ya no está en el hogar')
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

describe('lo que se anota de una persona', () => {
  const plan = (member: string) => ({ typeId: 'medicationPlan', data: { member, name: 'A', dose: '1', times: ['09:00'], startDate: '2026-11-01' }, sharedWith: [home.pilar] })
  const intake = (member: string, id: string) => ({ typeId: 'medicationIntake', data: { member, plan: id, date: '2026-11-24', time: '09:00', status: 'taken' } })
  test('nadie da por tomada la medicación de otra persona', async () => {
    const other = await home.records.create(home.marta, plan(home.marta))
    await expect(home.records.create(home.pilar, intake(home.pilar, other.id))).rejects.toMatchObject({ fields: { plan: 'Es de otra persona' } })
    await expect(home.records.create(home.marta, intake(home.pilar, other.id))).rejects.toMatchObject({ fields: { plan: 'Es de otra persona' } })
  })
  test('la propia sí', async () => {
    const own = await home.records.create(home.marta, plan(home.pilar))
    await expect(home.records.create(home.pilar, intake(home.pilar, own.id))).resolves.toMatchObject({ subjectIds: [home.pilar] })
  })
})

describe('completar tareas que se repiten', () => {
  test.each([
    ['daily', '2026-11-23', '2026-11-24'],
    ['daily', '2026-11-24', '2026-11-25'],
    ['weekly', '2026-11-01', '2026-11-29'],
    ['weekly', '2026-11-25', '2026-12-02'],
    ['monthly', '2025-01-31', '2026-11-30'],
    ['yearly', '2020-11-24', '2026-11-24'],
  ])('avanza %s desde %s hasta %s', async (repeat, dueDate, expected) => {
    const record = await home.records.create(home.marta, task({ repeat, dueDate, time: '09:00' }))
    const saved = await home.records.setDone(home.marta, record.id, true)
    expect(saved.data).toMatchObject({ done: false, dueDate: expected, time: '09:00' })
  })

  test.each([['2027', '28'], ['2028', '29']])('respeta el 31 después de febrero de %s y al editar', async (year, day) => {
    const record = await home.records.create(home.marta, task({ repeat: 'monthly', dueDate: `${year}-01-31` }))
    const feb = await home.records.setDone(home.marta, record.id, true)
    expect(feb.data.dueDate).toBe(`${year}-02-${day}`)
    await home.records.update(home.marta, record.id, { data: { ...feb.data, title: 'Pan integral' } })
    const march = await home.records.setDone(home.marta, record.id, true)
    expect(march.data.dueDate).toBe(`${year}-03-31`)
  })

  test('una tarea anual del 29 vuelve al 29 en el siguiente año bisiesto', async () => {
    const record = await home.records.create(home.marta, task({ repeat: 'yearly', dueDate: '2024-02-29' }))
    const first = await home.records.setDone(home.marta, record.id, true)
    expect(first.data.dueDate).toBe('2027-02-28')
    const next = await home.records.setDone(home.marta, record.id, true)
    expect(next.data.dueDate).toBe('2028-02-29')
  })

  test('si se cambia el día pendiente, la repetición sigue el día elegido', async () => {
    const record = await home.records.create(home.marta, task({ repeat: 'monthly', dueDate: '2027-01-31' }))
    const feb = await home.records.setDone(home.marta, record.id, true)
    await home.records.update(home.marta, record.id, { data: { ...feb.data, dueDate: '2027-02-25' } })
    expect((await home.records.setDone(home.marta, record.id, true)).data.dueDate).toBe('2027-03-25')
  })

  test('la fecha final cuenta y al completarla se puede deshacer', async () => {
    const record = await home.records.create(home.marta, task({ repeat: 'daily', dueDate: '2026-11-24', until: '2026-11-25' }))
    const first = await home.records.setDone(home.marta, record.id, true)
    expect(first.data).toMatchObject({ done: false, dueDate: '2026-11-25' })
    const last = await home.records.setDone(home.marta, record.id, true)
    expect(last.data).toMatchObject({ done: true, dueDate: '2026-11-25' })
    await last.undo()
    expect((await home.records.get(home.marta, record.id))?.data).toEqual(first.data)
  })

  test('si el fin quedó en el pasado, queda hecha al completar la pendiente', async () => {
    const record = await home.records.create(home.marta, task({ repeat: 'daily', dueDate: '2026-11-18', until: '2026-11-20' }))
    expect((await home.records.setDone(home.marta, record.id, true)).data).toMatchObject({ done: true, dueDate: '2026-11-18' })
  })

  test('quien solo completa recupera la fecha anterior sin poder elegir otra ni editar la tarea', async () => {
    const record = await home.records.create(home.marta, task({ members: [home.pilar], dueDate: '2026-11-01', repeat: 'daily' }))
    await expect(home.records.setDone(home.andres, record.id, true)).rejects.toThrow('No tienes permiso')
    await expect(home.records.update(home.pilar, record.id, { data: { ...record.data, dueDate: '2026-12-01' } })).rejects.toThrow('No tienes permiso')
    await expect(home.records.setDone(home.pilar, record.id, true, { dueDate: '2026-12-01', done: false })).rejects.toThrow('La tarea ya cambió')
    const saved = await home.records.setDone(home.pilar, record.id, true)
    await saved.undo()
    expect((await home.records.get(home.marta, record.id))?.data).toEqual(record.data)
  })

  test('deshacer vuelve a comprobar el permiso', async () => {
    const record = await home.records.create(home.marta, task({ members: [home.pilar], dueDate: '2026-11-24', repeat: 'daily' }))
    const saved = await home.records.setDone(home.pilar, record.id, true)
    await home.records.update(home.marta, record.id, { data: { ...saved.data, members: [home.andres] } })
    await expect(saved.undo()).rejects.toThrow('No tienes permiso')
  })

  test('dos clics sobre la misma fecha solo completan una vez', async () => {
    const record = await home.records.create(home.marta, task({ dueDate: '2026-11-24', repeat: 'daily' }))
    const shown = { dueDate: record.data.dueDate, done: false }
    const outcomes = await Promise.allSettled([
      home.records.setDone(home.marta, record.id, true, shown),
      home.records.setDone(home.marta, record.id, true, shown),
    ])
    expect(outcomes.map(({ status }) => status)).toEqual(['fulfilled', 'rejected'])
    expect((await home.records.get(home.marta, record.id))?.data.dueDate).toBe('2026-11-25')
  })

  test('un deshacer antiguo no pisa la fecha de otro completado', async () => {
    const record = await home.records.create(home.marta, task({ dueDate: '2026-11-24', repeat: 'daily' }))
    const first = await home.records.setDone(home.marta, record.id, true)
    await home.records.setDone(home.marta, record.id, true)
    await expect(first.undo()).rejects.toThrow('La tarea ya cambió')
    expect((await home.records.get(home.marta, record.id))?.data.dueDate).toBe('2026-11-26')
  })

  test('deshacer no pisa una fecha editada en el mismo instante', async () => {
    const record = await home.records.create(home.marta, task({ dueDate: '2026-11-24', repeat: 'daily' }))
    const saved = await home.records.setDone(home.marta, record.id, true)
    home.clock.now = new Date(saved.updatedAt)
    await home.records.update(home.marta, record.id, { data: { ...saved.data, dueDate: '2026-12-01' } })
    await expect(saved.undo()).rejects.toThrow('La tarea ya cambió')
    expect((await home.records.get(home.marta, record.id))?.data.dueDate).toBe('2026-12-01')
  })

  test('una fecha en el último día válido se puede completar', async () => {
    const record = await home.records.create(home.marta, task({ dueDate: '9999-12-31', repeat: 'daily' }))
    expect((await home.records.setDone(home.marta, record.id, true)).data).toMatchObject({ dueDate: '9999-12-31', done: true })
  })
})

describe('dos personas a la vez', () => {
  test('dos cambios en el mismo instante no se confunden', async () => {
    const r = await home.records.create(home.marta, task())
    const one = await home.records.update(home.marta, r.id, { data: { title: 'Uno' }, ifUnchanged: r.updatedAt })
    expect(one.updatedAt > r.updatedAt).toBe(true)
    await expect(home.records.update(home.marta, r.id, { data: { title: 'Dos' }, ifUnchanged: r.updatedAt })).rejects.toThrow('ha cambiado')
  })
  test('perder o recuperar un enlace también cuenta como cambio', async () => {
    const recipe = await home.records.create(home.marta, { typeId: 'recipe', data: { title: 'Lentejas', minutes: 40, ingredients: [{ name: 'Lentejas' }] } })
    const meal = await home.records.create(home.marta, { typeId: 'mealPlan', data: { date: '2026-11-24', meal: 'lunch', recipe: recipe.id, dish: 'Lentejas' } })
    const entry = await home.records.remove(home.marta, recipe.id)
    const lost = (await home.records.get(home.marta, meal.id))!
    expect(lost.updatedAt > meal.updatedAt).toBe(true)
    expect(lost.history?.at(-1)).toMatchObject({ kind: 'changed', fields: ['recipe'] })
    await home.trash.restore(home.marta, entry)
    const back = (await home.records.get(home.marta, meal.id))!
    expect(back.updatedAt > lost.updatedAt).toBe(true)
    await expect(home.records.update(home.marta, meal.id, { data: lost.data, ifUnchanged: lost.updatedAt })).rejects.toThrow('ha cambiado')
  })
  test('elegir quién ve una copia exige que el original no haya cambiado', async () => {
    const r = await home.records.create(home.marta, { ...task(), visibility: 'restricted', sharedWith: [home.andres] })
    await home.records.update(home.marta, r.id, { sharedWith: [] })
    await expect(home.records.create(home.marta, { ...task(), copyOf: r.id, ifUnchanged: r.updatedAt, visibility: 'restricted', sharedWith: [home.andres] })).rejects.toThrow('ha cambiado')
  })
  test('guardar una ficha abierta antes de un cambio no lo pisa', async () => {
    const r = await home.records.create(home.andres, task())
    home.clock.now = new Date('2026-11-24T09:05:00.000Z')
    await home.records.update(home.andres, r.id, { visibility: 'restricted' })
    await expect(home.records.update(home.marta, r.id, { data: { title: 'Otro' }, ifUnchanged: r.updatedAt })).rejects.toThrow('ha cambiado mientras la tenías abierta')
    await home.records.update(home.marta, r.id, { data: { title: 'Otro' } })
    expect(await home.records.get(home.marta, r.id)).toMatchObject({ visibility: 'restricted', data: { title: 'Otro' } })
  })
  test('la copia la ve quien pueda ver el original al guardarla', async () => {
    const r = await home.records.create(home.marta, task())
    await home.records.update(home.marta, r.id, { visibility: 'restricted', sharedWith: [home.andres] })
    expect(await home.records.create(home.andres, { ...task(), copyOf: r.id })).toMatchObject({ visibility: 'restricted', sharedWith: [home.andres], ownerId: home.andres })
    await home.records.update(home.marta, r.id, { visibility: 'private' })
    await expect(home.records.create(home.andres, { ...task(), copyOf: r.id })).rejects.toThrow('Ese registro ya no existe')
  })
})

describe('uno solo por categoría', () => {
  const budget = (category: string, limit = 10000) => ({ typeId: 'budget', data: { category, limit } })
  test.runIf(RECORD_TYPES.some((t) => t.id === 'budget'))('no se repite al crear ni al cambiar', async () => {
    const food = await home.records.create(home.marta, budget('food'))
    await expect(home.records.create(home.marta, budget('food'))).rejects.toMatchObject({ fields: { category: 'Ya hay otro igual. Cámbialo en vez de añadir uno nuevo.' } })
    const other = await home.records.create(home.marta, budget('home'))
    await expect(home.records.update(home.marta, other.id, { data: budget('food').data })).rejects.toMatchObject({ fields: { category: expect.any(String) as string } })
    await expect(home.records.update(home.marta, food.id, { data: budget('food', 20000).data })).resolves.toMatchObject({ data: { limit: 20000 } })
  })
})
