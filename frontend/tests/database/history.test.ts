import { beforeEach, expect, test } from 'vitest'
import { VitaDb } from '@/database/db'
import { createRepositories } from '@/database/repositories'
import { openTestHome } from '../support/database'

let home: Awaited<ReturnType<typeof openTestHome>>
beforeEach(async () => { home = await openTestHome() })
const create = () => home.records.create(home.andres, { typeId: 'task', data: { title: 'Pan', members: [home.pilar] } })
const kinds = async (id: string) => (await home.records.get(home.marta, id))!.history?.map((h) => [h.by, h.kind])

test('crear no apunta cambios', async () => expect((await create()).history).toBeUndefined())
test('cada cambio queda a nombre de quien lo hizo', async () => {
  const r = await create()
  await home.records.update(home.marta, r.id, { data: { title: 'Pan integral', members: [home.pilar] } })
  const { undo } = await home.records.setDone(home.pilar, r.id, true)
  await undo()
  expect(await kinds(r.id)).toEqual([[home.marta, 'changed'], [home.pilar, 'done'], [home.pilar, 'pending']])
})
test('una tarea que se repite apunta cada vez', async () => {
  const r = await home.records.create(home.marta, { typeId: 'task', data: { title: 'Regar', dueDate: '2026-11-24', repeat: 'daily' } })
  await home.records.setDone(home.marta, r.id, true)
  expect(await kinds(r.id)).toEqual([[home.marta, 'done']])
})
test('recuperar de la papelera también', async () => {
  const r = await create()
  await home.trash.restore(home.marta, await home.records.remove(home.marta, r.id))
  expect(await kinds(r.id)).toEqual([[home.marta, 'restored']])
})
test('viaja en la copia, y una copia sin historial sigue valiendo', async () => {
  const r = await create()
  await home.records.update(home.marta, r.id, { data: { title: 'Otro' } })
  const text = JSON.stringify(await home.backup.export(home.marta))
  const db = new VitaDb('vita-history-restore')
  const other = createRepositories(db)
  await other.backup.restore(null, text)
  expect((await db.records.get(r.id))?.history).toEqual((await home.records.get(home.marta, r.id))!.history)
  const old = JSON.parse(text) as { version: number; records: { history?: unknown }[] }
  for (const record of old.records) delete record.history
  await expect(home.backup.restore(home.marta, JSON.stringify({ ...old, version: 2 }))).resolves.toBeUndefined()
})
