import { beforeEach, describe, expect, test } from 'vitest'
import { VitaDb } from '@/database/db'
import { createRepositories } from '@/database/repositories'
import { openTestHome, person } from '../support/database'

let home: Awaited<ReturnType<typeof openTestHome>>
beforeEach(async () => { home = await openTestHome() })

const memberNames = async () => (await home.family.listMembers()).map((m) => m.name).toSorted()

describe('crear la familia', () => {
  test('guarda familia e integrantes', async () => {
    expect(await home.family.get()).toMatchObject({ name: 'Los Robles', enabledModules: ['pets', 'emergency', 'planner'] })
    expect(await memberNames()).toEqual(['Andrés', 'Marta', 'Nora', 'Pilar'])
  })
  test('los datos siguen ahí al volver a abrir la base', async () => {
    home.db.close()
    const reopened = createRepositories(new VitaDb(home.db.name), () => home.clock.now)
    expect((await reopened.family.get())?.name).toBe('Los Robles')
  })
  test('solo hay una familia por dispositivo', async () => {
    await expect(home.family.setup({ family: { name: 'Otra', enabledModules: [] }, members: [person('X', 'master')] }))
      .rejects.toThrow('Ya hay un hogar guardado en este dispositivo')
  })
  test('sin máster no se crea nada', async () => {
    const db = new VitaDb('vita-sin-master')
    const { family } = createRepositories(db)
    await expect(family.setup({ family: { name: 'A', enabledModules: [] }, members: [person('X', 'member')] }))
      .rejects.toThrow('El hogar necesita al menos un máster')
    expect(await family.get()).toBeUndefined()
    expect(await family.listMembers()).toEqual([])
  })
  test('un integrante mal escrito cancela toda la operación', async () => {
    const { family } = createRepositories(new VitaDb('vita-mal'))
    await expect(family.setup({ family: { name: 'A', enabledModules: [] }, members: [person('X', 'master'), person(' ', 'member')] }))
      .rejects.toThrow('Escribe el nombre')
    expect(await family.get()).toBeUndefined()
  })
})

describe('gestionar integrantes', () => {
  test('el máster añade y modifica', async () => {
    const leo = await home.family.addMember(home.marta, person('Leo', 'member'))
    home.clock.now = new Date('2026-11-25T09:00:00.000Z')
    await home.family.updateMember(home.marta, leo.id, { role: 'vulnerable', moduleAccess: { finances: 'read' } })
    const saved = (await home.family.listMembers()).find((m) => m.id === leo.id)
    expect(saved).toMatchObject({ name: 'Leo', role: 'vulnerable', moduleAccess: { finances: 'read' }, createdAt: '2026-11-24T09:00:00.000Z', updatedAt: '2026-11-25T09:00:00.000Z' })
  })
  test('los demás no añaden ni eliminan', async () => {
    await expect(home.family.addMember(home.andres, person('Leo', 'member'))).rejects.toThrow('No tienes permiso')
    await expect(home.family.removeMember(home.pilar, home.nora)).rejects.toThrow('No tienes permiso')
  })
  test('cada persona cambia su perfil, pero no su rol ni sus permisos', async () => {
    await home.family.updateMember(home.andres, home.andres, { name: 'Andrés R.' })
    expect(await memberNames()).toContain('Andrés R.')
    await expect(home.family.updateMember(home.andres, home.andres, { role: 'master' })).rejects.toThrow('No tienes permiso')
    await expect(home.family.updateMember(home.andres, home.andres, { moduleAccess: { finances: 'write' } })).rejects.toThrow('No tienes permiso')
    await expect(home.family.updateMember(home.andres, home.nora, { name: 'X' })).rejects.toThrow('No tienes permiso')
  })
  test('siempre queda un máster', async () => {
    await expect(home.family.updateMember(home.marta, home.marta, { role: 'member' })).rejects.toThrow('El hogar necesita al menos un máster')
    await home.family.updateMember(home.marta, home.andres, { role: 'master' })
    await home.family.updateMember(home.marta, home.marta, { role: 'member' })
    expect((await home.family.listMembers()).filter((m) => m.role === 'master').map((m) => m.id)).toEqual([home.andres])
  })
  test('nadie se elimina a sí mismo', async () => {
    await expect(home.family.removeMember(home.marta, home.marta)).rejects.toThrow('No puedes eliminar tu propio perfil')
  })
  test('un actor que ya no existe no puede hacer nada', async () => {
    await home.family.removeMember(home.marta, home.nora)
    await expect(home.records.list(home.nora, { typeId: 'task' })).rejects.toThrow('Ese perfil ya no existe')
  })
  test('activar módulos es cosa del máster y lo esencial no se apaga', async () => {
    await expect(home.family.update(home.andres, { enabledModules: [] })).rejects.toThrow('No tienes permiso')
    await home.family.update(home.marta, { enabledModules: ['school'] })
    expect((await home.family.get())?.enabledModules).toEqual(['school', 'emergency', 'planner'])
  })
})

describe('eliminar a un integrante', () => {
  test('borra lo suyo, conserva lo común y no deja referencias colgando', async () => {
    const { records, marta, andres, nora } = home
    const aboutNora = await records.create(marta, { typeId: 'appointment', data: { member: nora, title: 'Revisión', date: '2026-12-01' } })
    const privateNora = await records.create(nora, { typeId: 'task', data: { title: 'Sorpresa' }, visibility: 'private' })
    const ownedByNora = await records.create(nora, { typeId: 'task', data: { title: 'Regar', members: [nora, andres] } })
    const shared = await records.create(marta, { typeId: 'document', data: { title: 'Seguro', kind: 'insurance' }, sharedWith: [nora] })

    expect(await home.family.previewMemberRemoval(marta, nora)).toEqual({ removed: 2, changed: 2 })
    await home.family.removeMember(marta, nora)

    expect(await home.db.records.bulkGet([aboutNora.id, privateNora.id])).toEqual([undefined, undefined])
    expect(await home.db.records.get(ownedByNora.id)).toMatchObject({ ownerId: marta, subjectIds: [andres], data: { members: [andres] } })
    expect(await home.db.records.get(shared.id)).toMatchObject({ sharedWith: [] })
    expect(JSON.stringify(await home.db.records.toArray())).not.toContain(nora)
  })
  test('arrastra lo que dependía de sus registros', async () => {
    const { records, marta, pilar } = home
    const plan = await records.create(marta, { typeId: 'medicationPlan', data: { member: pilar, name: 'Enalapril', dose: '10 mg', times: ['09:00'], startDate: '2026-11-01' } })
    await records.create(pilar, { typeId: 'medicationIntake', data: { member: pilar, plan: plan.id, date: '2026-11-24', time: '09:00', status: 'taken' } })
    await home.family.removeMember(marta, pilar)
    expect(await home.db.records.count()).toBe(0)
  })
  test('un responsable opcional simplemente se quita', async () => {
    const { records, marta, pilar, andres } = home
    const visit = await records.create(marta, { typeId: 'appointment', data: { member: pilar, title: 'Vista', date: '2026-12-01', companion: andres } })
    await home.family.removeMember(marta, andres)
    const saved = await home.db.records.get(visit.id)
    expect(saved?.data).not.toHaveProperty('companion')
    expect(saved?.subjectIds).toEqual([pilar])
  })
})
