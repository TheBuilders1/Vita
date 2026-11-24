import { beforeEach, expect, test } from 'vitest'
import { MAX_FILE_BYTES } from '@/types/records'
import { openTestHome } from '../support/database'

let home: Awaited<ReturnType<typeof openTestHome>>
beforeEach(async () => { home = await openTestHome() })

const pdf = (text = 'contenido') => new File([text], 'dni.pdf', { type: 'application/pdf' })
const doc = (files: string[]) => ({ typeId: 'document', data: { title: 'DNI', kind: 'id', files } })

test('el archivo se guarda y se recupera íntegro', async () => {
  const file = await home.files.add(home.marta, pdf())
  expect(file).toMatchObject({ name: 'dni.pdf', mime: 'application/pdf', size: 9 })
  expect(await (await home.files.get(home.marta, file.id))?.blob.text()).toBe('contenido')
})

test('rechaza tipos que el navegador podría ejecutar, archivos vacíos y demasiado grandes', async () => {
  await expect(home.files.add(home.marta, new File(['<svg/>'], 'a.svg', { type: 'image/svg+xml' }))).rejects.toThrow('Solo se admiten')
  await expect(home.files.add(home.marta, new File([], 'a.pdf', { type: 'application/pdf' }))).rejects.toThrow('El archivo está vacío')
  await expect(home.files.add(home.marta, new File([new Uint8Array(MAX_FILE_BYTES + 1)], 'a.pdf', { type: 'application/pdf' }))).rejects.toThrow('El archivo supera')
})

test('un archivo hereda la visibilidad del registro que lo usa', async () => {
  const file = await home.files.add(home.marta, pdf())
  expect(await home.files.get(home.andres, file.id)).toBeUndefined()
  const record = await home.records.create(home.marta, doc([file.id]))
  expect(await home.files.get(home.andres, file.id)).toBeUndefined()
  await home.records.update(home.marta, record.id, { sharedWith: [home.andres] })
  expect(await home.files.get(home.andres, file.id)).toMatchObject({ name: 'dni.pdf' })
})

test('nadie adjunta archivos inexistentes, ajenos o ya usados', async () => {
  await expect(home.records.create(home.marta, doc(['nada']))).rejects.toThrow('Ese archivo ya no está disponible')
  const file = await home.files.add(home.marta, pdf())
  await expect(home.records.create(home.andres, doc([file.id]))).rejects.toThrow('Ese archivo ya no está disponible')
  await home.records.create(home.marta, doc([file.id]))
  await expect(home.records.create(home.marta, doc([file.id]))).rejects.toThrow('Ese archivo ya no está disponible')
})

test('quitar el archivo o borrar el registro libera su espacio', async () => {
  const [a, b] = [await home.files.add(home.marta, pdf('a')), await home.files.add(home.marta, pdf('b'))]
  const record = await home.records.create(home.marta, doc([a.id, b.id]))
  await home.records.update(home.marta, record.id, { data: { title: 'DNI', kind: 'id', files: [b.id] } })
  expect(await home.db.files.toCollection().primaryKeys()).toEqual([b.id])
  await home.records.remove(home.marta, record.id)
  expect(await home.db.files.count()).toBe(0)
})

test('los archivos que nunca se llegaron a adjuntar se limpian pasado un día', async () => {
  const attached = await home.files.add(home.marta, pdf())
  await home.records.create(home.marta, doc([attached.id]))
  await home.files.add(home.marta, pdf('abandonado'))
  home.clock.now = new Date('2026-11-25T08:59:00.000Z')
  expect(await home.files.purgeAbandoned()).toBe(0)
  home.clock.now = new Date('2026-11-25T09:01:00.000Z')
  expect(await home.files.purgeAbandoned()).toBe(1)
  expect(await home.db.files.toCollection().primaryKeys()).toEqual([attached.id])
})

test('al eliminar a un integrante se borran también sus archivos', async () => {
  const file = await home.files.add(home.marta, pdf())
  await home.records.create(home.marta, { typeId: 'condition', data: { member: home.nora, title: 'Asma', kind: 'illness', files: [file.id] } })
  await home.family.removeMember(home.marta, home.nora)
  expect(await home.db.files.count()).toBe(0)
})

test('al eliminar a un integrante desaparece también lo que subió sin llegar a guardar', async () => {
  await home.files.add(home.nora, pdf())
  const kept = await home.files.add(home.andres, pdf())
  await home.family.removeMember(home.marta, home.nora)
  expect(await home.db.files.toCollection().primaryKeys()).toEqual([kept.id])
})
