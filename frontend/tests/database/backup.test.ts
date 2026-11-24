import { beforeEach, describe, expect, test } from 'vitest'
import { VitaDb } from '@/database/db'
import { createRepositories } from '@/database/repositories'
import { openTestHome } from '../support/database'

let home: Awaited<ReturnType<typeof openTestHome>>
let n = 0
const fresh = () => { const db = new VitaDb(`vita-restore-${++n}`); return { db, ...createRepositories(db, () => new Date('2026-12-01T10:00:00.000Z')) } }
beforeEach(async () => {
  home = await openTestHome()
  const file = await home.files.add(home.marta, new File([new Uint8Array([0, 255, 128, 10])], 'dni.pdf', { type: 'application/pdf' }))
  await home.records.create(home.marta, { typeId: 'document', data: { title: 'DNI', kind: 'id', member: home.pilar, files: [file.id] } })
  await home.records.create(home.andres, { typeId: 'task', data: { title: 'Secreta' }, visibility: 'private' })
})
const backup = async () => JSON.stringify(await home.backup.export(home.marta))
interface Loose { version: number; members: { role: string }[]; records: { typeId: string; ownerId: string; moduleId: string; subjectIds: string[]; data: Record<string, unknown> }[]; files: { mime: string }[] }
const broken = async (change: (data: Loose) => void) => { const data = JSON.parse(await backup()) as Loose; change(data); return JSON.stringify(data) }

describe('exportar', () => {
  test('solo quien administra los datos', async () => {
    await expect(home.backup.export(home.andres)).rejects.toThrow('No tienes permiso')
  })
  test('se recuerda cuándo fue la última', async () => {
    expect(await home.backup.lastExport()).toBeNull()
    await backup()
    expect(await home.backup.lastExport()).toBe('2026-11-24')
  })
})

describe('restaurar', () => {
  test('en otro dispositivo queda todo idéntico, archivos incluidos', async () => {
    const other = fresh()
    await other.backup.restore(null, await backup())
    expect(await other.db.members.toArray()).toEqual(await home.db.members.toArray())
    expect(await other.db.records.toArray()).toEqual(await home.db.records.toArray())
    expect(await other.family.get()).toEqual(await home.family.get())
    const [file] = await other.db.files.toArray()
    expect([...new Uint8Array(await file!.blob.arrayBuffer())]).toEqual([0, 255, 128, 10])
    expect(file).toMatchObject({ name: 'dni.pdf', mime: 'application/pdf', size: 4 })
  })
  test('sustituye lo que había', async () => {
    const copy = await backup()
    await home.records.create(home.marta, { typeId: 'task', data: { title: 'Posterior' } })
    await home.backup.restore(home.marta, copy)
    expect(await home.db.records.count()).toBe(2)
  })
  test('con una familia dentro, solo su máster', async () => {
    const copy = await backup()
    await expect(home.backup.restore(home.andres, copy)).rejects.toThrow('No tienes permiso')
    await expect(home.backup.restore(null, copy)).rejects.toThrow('No tienes permiso')
  })
  test.each([
    ['no es JSON', async () => 'hola', 'El archivo no es una copia de Vita'],
    ['es otro JSON', async () => '{"a":1}', 'El archivo no es una copia de Vita'],
    ['es de una versión futura', () => broken((d) => { d.version = 99 }), 'La copia es de una versión más nueva de Vita'],
    ['tiene un registro inválido', () => broken((d) => { d.records[0]!.data.title = '' }), 'La copia está dañada'],
    ['tiene un tipo desconocido', () => broken((d) => { d.records[0]!.typeId = 'nope' }), 'La copia está dañada'],
    ['le falta un archivo', () => broken((d) => { d.files = [] }), 'La copia está dañada'],
    ['apunta a una persona que no está', () => broken((d) => { d.records[0]!.ownerId = 'nadie' }), 'La copia está dañada'],
    ['no tiene máster', () => broken((d) => { for (const m of d.members) m.role = 'member' }), 'La copia está dañada'],
    ['repite identificadores', () => broken((d) => { d.records.push(d.records[0]!) }), 'La copia está dañada'],
    ['trae un archivo ejecutable', () => broken((d) => { d.files[0]!.mime = 'text/html' }), 'La copia está dañada'],
  ])('si %s no toca nada', async (_name, make, message) => {
    const before = await home.db.records.toArray()
    await expect(home.backup.restore(home.marta, await make())).rejects.toThrow(message)
    expect(await home.db.records.toArray()).toEqual(before)
    expect(await home.db.files.count()).toBe(1)
  })
  test('los permisos derivados no se creen: se recalculan', async () => {
    await home.backup.restore(home.marta, await broken((d) => { const doc = d.records.find((r) => r.typeId === 'document')!; doc.subjectIds = [home.nora]; doc.moduleId = 'album' }))
    const doc = (await home.db.records.toArray()).find((r) => r.typeId === 'document')!
    expect(doc).toMatchObject({ subjectIds: [home.pilar], moduleId: 'documents' })
  })
})

describe('consejos descartados', () => {
  test('se recuerdan y se pueden recuperar', async () => {
    await home.tips.dismiss('a')
    await home.tips.dismiss('a')
    await home.tips.dismiss('b')
    expect(await home.tips.dismissed()).toEqual(['a', 'b'])
    await home.tips.restore()
    expect(await home.tips.dismissed()).toEqual([])
  })
})
