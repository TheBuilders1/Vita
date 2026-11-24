import { beforeEach, describe, expect, test } from 'vitest'
import { openTestHome } from '../support/database'

let home: Awaited<ReturnType<typeof openTestHome>>
beforeEach(async () => { home = await openTestHome() })

/** Recuperar queda apuntado en el historial; lo demás vuelve idéntico. */
const same = async (id: string, original: object) => {
  const { history, ...rest } = (await home.records.get(home.marta, id))!
  expect(rest).toEqual({ ...original, updatedAt: rest.updatedAt })
  expect(history?.at(-1)).toMatchObject({ by: home.marta, kind: 'restored' })
}
const task = (title = 'Comprar pan') => ({ typeId: 'task', data: { title } })
const listWithItem = async () => {
  const list = await home.records.create(home.marta, { typeId: 'shoppingList', data: { name: 'Casa' } })
  const item = await home.records.create(home.marta, { typeId: 'shoppingItem', data: { name: 'Pan', list: list.id } })
  return { list, item }
}
const days = (n: number) => { home.clock.now = new Date(home.clock.now.getTime() + n * 86_400_000) }

describe('deshacer un borrado', () => {
  test('el registro vuelve igual que estaba', async () => {
    const record = await home.records.create(home.marta, task())
    const entry = await home.records.remove(home.marta, record.id)
    expect(await home.records.get(home.marta, record.id)).toBeUndefined()
    await home.trash.restore(home.marta, entry)
    await same(record.id, record)
    expect(await home.trash.list(home.marta)).toEqual([])
  })
  test('vuelven también sus archivos', async () => {
    const file = await home.files.add(home.marta, new File(['hola'], 'nota.txt', { type: 'text/plain' }))
    const record = await home.records.create(home.marta, { typeId: 'document', data: { title: 'Contrato', kind: 'contract', files: [file.id] } })
    const entry = await home.records.remove(home.marta, record.id)
    expect(await home.db.files.count()).toBe(0)
    await home.trash.restore(home.marta, entry)
    expect(await home.files.get(home.marta, file.id)).toMatchObject({ name: 'nota.txt', recordId: record.id })
  })
  test('vuelve lo que dependía de él', async () => {
    const { list, item } = await listWithItem()
    await home.trash.restore(home.marta, await home.records.remove(home.marta, list.id))
    await same(item.id, item)
  })
  test('vuelve el enlace que perdió otro registro, sin pisar lo cambiado después', async () => {
    const recipe = await home.records.create(home.marta, { typeId: 'recipe', data: { title: 'Lentejas', minutes: 40, ingredients: [{ name: 'Lentejas' }] } })
    const meal = await home.records.create(home.marta, { typeId: 'mealPlan', data: { date: '2026-11-24', meal: 'lunch', recipe: recipe.id, dish: 'Lentejas' } })
    const entry = await home.records.remove(home.marta, recipe.id)
    const left = (await home.records.get(home.marta, meal.id))!
    expect(left.data.recipe).toBeUndefined()
    await home.records.update(home.marta, meal.id, { data: { ...left.data, dish: 'Lentejas con arroz' } })
    await home.trash.restore(home.marta, entry)
    expect((await home.records.get(home.marta, meal.id))!.data).toMatchObject({ recipe: recipe.id, dish: 'Lentejas con arroz' })
  })
  test('si dependía de algo que también se borró, lo explica y no pierde nada', async () => {
    const { list, item } = await listWithItem()
    const first = await home.records.remove(home.marta, item.id)
    const second = await home.records.remove(home.marta, list.id)
    await expect(home.trash.restore(home.marta, first)).rejects.toThrow('Recupera antes «Casa»')
    await home.trash.restore(home.marta, second)
    await home.trash.restore(home.marta, first)
    await same(item.id, item)
  })
  test('recuperarlo dos veces dice que ya no está', async () => {
    const record = await home.records.create(home.marta, task())
    const entry = await home.records.remove(home.marta, record.id)
    await home.trash.restore(home.marta, entry)
    await expect(home.trash.restore(home.marta, entry)).rejects.toThrow('Eso ya no se puede recuperar')
  })
  test('deshacer algo recién apuntado no deja rastro', async () => {
    const record = await home.records.create(home.marta, task())
    await home.records.erase(home.marta, record.id)
    expect(await home.trash.list(home.marta)).toEqual([])
    expect(await home.db.trash.count()).toBe(0)
  })
})

describe('quién ve lo borrado', () => {
  test('cada cual solo recupera lo que podía borrar', async () => {
    const own = await home.records.create(home.andres, { ...task('Suya'), visibility: 'private' })
    const entry = await home.records.remove(home.andres, own.id)
    expect((await home.trash.list(home.andres)).map((e) => e.record.data.title)).toEqual(['Suya'])
    expect(await home.trash.list(home.marta)).toEqual([])
    await expect(home.trash.restore(home.marta, entry)).rejects.toThrow('Eso ya no se puede recuperar')
    await expect(home.trash.discard(home.marta, entry)).rejects.toThrow('Eso ya no se puede recuperar')
  })
  test('lo más reciente va primero y con su fecha', async () => {
    const one = await home.records.create(home.marta, task('Uno'))
    const two = await home.records.create(home.marta, task('Dos'))
    await home.records.remove(home.marta, one.id)
    days(1)
    await home.records.remove(home.marta, two.id)
    expect((await home.trash.list(home.marta)).map((e) => [e.record.data.title, e.deletedAt.slice(0, 10)])).toEqual([['Dos', '2026-11-25'], ['Uno', '2026-11-24']])
  })
})

describe('lo que no se puede ver', () => {
  const hidden = async () => {
    const list = await home.records.create(home.marta, { typeId: 'shoppingList', data: { name: 'Casa' } })
    const secret = await home.records.create(home.andres, { typeId: 'shoppingItem', data: { name: 'Regalo', list: list.id }, visibility: 'private' })
    return { list, secret }
  }
  test('no se borra con lo que sí se ve', async () => {
    const { list, secret } = await hidden()
    for (const attempt of [home.records.previewRemoval(home.marta, list.id), home.records.remove(home.marta, list.id)]) {
      await expect(attempt).rejects.toThrow('Alguien más del hogar usa esto')
    }
    expect(await home.records.get(home.andres, secret.id)).toBeDefined()
    expect(await home.db.trash.count()).toBe(0)
  })
  test('recuperar no revela el nombre de algo que ya es privado', async () => {
    const list = await home.records.create(home.andres, { typeId: 'shoppingList', data: { name: 'Casa' } })
    const item = await home.records.create(home.marta, { typeId: 'shoppingItem', data: { name: 'Pan', list: list.id } })
    const entry = await home.records.remove(home.marta, item.id)
    await home.records.update(home.andres, list.id, { data: { name: 'Sorpresa' }, visibility: 'private' })
    const alive = await home.trash.restore(home.marta, entry).catch((e: unknown) => String(e))
    expect(alive).toContain('Depende de algo que ya no está disponible')
    await home.records.remove(home.andres, list.id)
    const gone = await home.trash.restore(home.marta, entry).catch((e: unknown) => String(e))
    expect(gone).not.toContain('Sorpresa')
    expect(await home.trash.list(home.marta)).toHaveLength(1)
  })
  test('no se vuelve a enlazar con algo de otra persona', async () => {
    const goal = await home.records.create(home.marta, { typeId: 'kidGoal', data: { member: home.pilar, name: 'Bici', target: 10000 } })
    const move = await home.records.create(home.marta, { typeId: 'kidMovement', data: { member: home.pilar, concept: 'Paga', amount: 500, kind: 'income', date: '2026-11-24', goal: goal.id } })
    const entry = await home.records.remove(home.marta, goal.id)
    const left = (await home.records.get(home.marta, move.id))!
    await home.records.update(home.marta, move.id, { data: { ...left.data, member: home.nora } })
    await home.trash.restore(home.marta, entry)
    expect((await home.records.get(home.marta, move.id))!.data.goal).toBeUndefined()
  })
})

describe('lo de los demás', () => {
  test('lo que se fue con una lista propia se puede recuperar, pero no destruir', async () => {
    const list = await home.records.create(home.andres, { typeId: 'shoppingList', data: { name: 'Casa' } })
    const item = await home.records.create(home.nora, { typeId: 'shoppingItem', data: { name: 'Pan', list: list.id } })
    const entry = await home.records.remove(home.andres, list.id)
    await expect(home.trash.discard(home.andres, entry)).rejects.toThrow('No tienes permiso')
    await home.trash.empty(home.andres)
    expect(await home.trash.list(home.andres)).toHaveLength(1)
    await home.trash.restore(home.andres, entry)
    expect(await home.records.get(home.nora, item.id)).toBeDefined()
  })
  test('quien administra no ve una entrada que lleva dentro algo privado', async () => {
    const list = await home.records.create(home.andres, { typeId: 'shoppingList', data: { name: 'Casa' } })
    await home.records.create(home.andres, { typeId: 'shoppingItem', data: { name: 'Regalo', list: list.id }, visibility: 'private' })
    const entry = await home.records.remove(home.andres, list.id)
    expect(await home.trash.list(home.marta)).toEqual([])
    await expect(home.trash.restore(home.marta, entry)).rejects.toThrow('Eso ya no se puede recuperar')
    expect(await home.trash.list(home.andres)).toHaveLength(1)
  })
  test('deshacer un alta no destruye lo que otra persona ya colgó de ella', async () => {
    const list = await home.records.create(home.andres, { typeId: 'shoppingList', data: { name: 'Casa' } })
    await home.records.create(home.nora, { typeId: 'shoppingItem', data: { name: 'Pan', list: list.id } })
    await home.records.erase(home.andres, list.id)
    expect(await home.trash.list(home.andres)).toHaveLength(1)
  })
  test('recuperar no deja dos topes de la misma categoría', async () => {
    const first = await home.records.create(home.marta, { typeId: 'budget', data: { category: 'food', limit: 100 } })
    const entry = await home.records.remove(home.marta, first.id)
    await home.records.create(home.marta, { typeId: 'budget', data: { category: 'food', limit: 200 } })
    await expect(home.trash.restore(home.marta, entry)).rejects.toThrow('Ya hay otro igual')
    expect(await home.trash.list(home.marta)).toHaveLength(1)
  })
})

describe('limpieza', () => {
  test('a los 30 días se borra de verdad', async () => {
    const record = await home.records.create(home.marta, task())
    await home.records.remove(home.marta, record.id)
    days(29)
    expect(await home.trash.purge()).toBe(0)
    days(2)
    expect(await home.trash.list(home.marta)).toEqual([])
    expect(await home.trash.purge()).toBe(1)
  })
  test('borrar para siempre y vaciar', async () => {
    const entries = []
    for (const title of ['Uno', 'Dos', 'Tres']) entries.push(await home.records.remove(home.marta, (await home.records.create(home.marta, task(title))).id))
    await home.trash.discard(home.marta, entries[0]!)
    expect(await home.trash.list(home.marta)).toHaveLength(2)
    await home.trash.empty(home.marta)
    expect(await home.db.trash.count()).toBe(0)
  })
  test('vaciar no toca lo que no se puede ver', async () => {
    const own = await home.records.create(home.andres, { ...task(), visibility: 'private' })
    await home.records.remove(home.andres, own.id)
    await home.trash.empty(home.marta)
    expect(await home.trash.list(home.andres)).toHaveLength(1)
  })
  test('al quitar a una persona, su papelera sigue las mismas reglas que lo demás', async () => {
    const secret = await home.records.create(home.andres, { ...task('Secreta'), visibility: 'private' })
    const own = await home.records.create(home.andres, task('Suya'))
    const about = await home.records.create(home.marta, { typeId: 'task', data: { title: 'Con Andrés', members: [home.andres] } })
    await home.records.remove(home.andres, secret.id)
    for (const r of [own, about]) await home.records.remove(home.marta, r.id)
    await home.family.removeMember(home.marta, home.andres)
    const left = await home.trash.list(home.marta)
    expect(left.map((e) => e.record.data.title).toSorted()).toEqual(['Con Andrés', 'Suya'])
    expect(left.every((e) => e.record.ownerId === home.marta && e.record.subjectIds.length === 0)).toBe(true)
    expect(await home.db.trash.count()).toBe(2)
    for (const e of left) await home.trash.restore(home.marta, e.id)
    expect(await home.records.list(home.marta)).toHaveLength(2)
  })
  test('lo de otra persona que iba con lo borrado no se lo lleva por delante', async () => {
    const list = await home.records.create(home.marta, { typeId: 'shoppingList', data: { name: 'Casa' } })
    const fever = await home.records.create(home.andres, { typeId: 'shoppingItem', data: { name: 'Pan', list: list.id } })
    const entry = await home.records.remove(home.marta, list.id)
    await home.family.removeMember(home.marta, home.andres)
    await home.trash.restore(home.marta, entry)
    expect(await home.records.get(home.marta, fever.id)).toMatchObject({ ownerId: home.marta })
  })
  test('borrar todo y restaurar una copia vacían la papelera', async () => {
    await home.records.remove(home.marta, (await home.records.create(home.marta, task())).id)
    const backup = JSON.stringify(await home.backup.export(home.marta))
    await home.backup.restore(home.marta, backup)
    expect(await home.db.trash.count()).toBe(0)
    await home.records.remove(home.marta, (await home.records.create(home.marta, task())).id)
    await home.family.wipe(home.marta)
    expect(await home.db.trash.count()).toBe(0)
  })
  test('lo borrado no viaja en la copia', async () => {
    await home.records.remove(home.marta, (await home.records.create(home.marta, task('Secreto'))).id)
    expect(JSON.stringify(await home.backup.export(home.marta))).not.toContain('Secreto')
  })
})
